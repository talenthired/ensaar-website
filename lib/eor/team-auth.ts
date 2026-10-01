import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { NextResponse } from 'next/server';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { enqueue } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import { teamInviteEmail, teamLoginEmail } from './email';
import { getEmployee, type EorEmployee } from './employees';
import { INVITE_LINK_TTL_DAYS, knownAs, LOGIN_LINK_TTL_MINUTES, PORTAL_SESSION_DAYS } from './onboarding';

/*
 * Sign-in for the employee portal (/team), the same way as the client portal:
 * no password, a one-time link to the employee's own email address, and only
 * hashes of link and session tokens are stored. An employee signs in as their
 * employee record, so they see only their own documents, tax and holidays.
 */

export const TEAM_COOKIE = 'ensaar_team';
type Executor = postgres.Sql | postgres.TransactionSql;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const site = () => siteConfig.url.replace(/\/+$/, '');

export const teamUrl = (path = '') => `${site()}/team${path}`;
const teamAuthLink = (token: string) => `${site()}/team/auth#${token}`;

/** Employees who may sign in: offered a job and not cancelled. Leavers keep access to their documents. */
const CAN_SIGN_IN = ['awaiting_signature', 'signed', 'onboarding', 'active', 'exited'];

async function createTeamLink(tx: Executor, employeeId: string, purpose: 'invite' | 'login'): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const minutes = purpose === 'invite' ? INVITE_LINK_TTL_DAYS * 24 * 60 : LOGIN_LINK_TTL_MINUTES;
  await tx`
    INSERT INTO ensaar_team_login_tokens (id, employee_id, token_hash, purpose, expires_at)
    VALUES (${randomUUID()}, ${employeeId}, ${sha256(token)}, ${purpose}, NOW() + make_interval(mins => ${minutes}))
  `;
  return teamAuthLink(token);
}

/**
 * Email an employee a link into the portal, saying why (documents to sign, a
 * holiday choice to make). Returned so staff can pass it on if email fails.
 */
export async function inviteEmployee(
  tx: Executor,
  employee: Pick<EorEmployee, 'id' | 'employeeName' | 'businessName' | 'employeeEmail' | 'companyName'>,
  reason: string,
): Promise<string | null> {
  if (!employee.employeeEmail) return null;
  const link = await createTeamLink(tx, employee.id, 'invite');
  await enqueue(tx, {
    kind: 'team.invite',
    to: [employee.employeeEmail],
    relatedId: employee.id,
    ...teamInviteEmail({ name: knownAs(employee), companyName: employee.companyName ?? null, reason, link }),
  });
  return link;
}

/** Email a sign-in link to each eligible employee record with this address. The caller answers the same either way. */
export async function requestTeamLogin(email: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const sql = db();
  const rows = await sql<{ id: string; employee_name: string; business_name: string | null }[]>`
    SELECT id, employee_name, business_name FROM ensaar_eor_employees
    WHERE lower(employee_email) = ${email.trim().toLowerCase()} AND status IN ${sql(CAN_SIGN_IN)}
    ORDER BY created_at DESC LIMIT 5
  `;
  for (const row of rows) {
    await sql.begin(async (tx) => {
      const link = await createTeamLink(tx, row.id, 'login');
      await enqueue(tx, { kind: 'team.login', to: [email], relatedId: row.id, ...teamLoginEmail({ name: row.business_name || row.employee_name, link }) });
    });
  }
  return rows.length;
}

/** Exchange a one-time link for a session; a link works once even if opened twice at the same moment. */
export async function consumeTeamToken(token: string): Promise<{ sessionToken: string; employeeId: string; email: string } | null> {
  if (!hasDatabase() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return requireDatabase().begin(async (tx) => {
    const [claimed] = await tx<{ employee_id: string }[]>`
      UPDATE ensaar_team_login_tokens SET used_at = NOW()
      WHERE token_hash = ${sha256(token)} AND used_at IS NULL AND expires_at > NOW()
      RETURNING employee_id
    `;
    if (!claimed) return null;
    const [row] = await tx<{ id: string; employee_email: string | null }[]>`
      SELECT id, employee_email FROM ensaar_eor_employees WHERE id = ${claimed.employee_id} AND status IN ${tx(CAN_SIGN_IN)}
    `;
    if (!row?.employee_email) return null;
    const sessionToken = randomBytes(32).toString('base64url');
    await tx`
      INSERT INTO ensaar_team_sessions (id, employee_id, token_hash, expires_at)
      VALUES (${randomUUID()}, ${row.id}, ${sha256(sessionToken)}, NOW() + make_interval(days => ${PORTAL_SESSION_DAYS}))
    `;
    await tx`DELETE FROM ensaar_team_login_tokens WHERE employee_id = ${row.id} AND (used_at IS NOT NULL OR expires_at < NOW())`;
    await tx`DELETE FROM ensaar_team_sessions WHERE employee_id = ${row.id} AND expires_at < NOW()`;
    return { sessionToken, employeeId: row.id, email: row.employee_email };
  });
}

export async function revokeTeamSession(sessionToken: string | undefined): Promise<void> {
  if (!sessionToken || !hasDatabase()) return;
  await db()`DELETE FROM ensaar_team_sessions WHERE token_hash = ${sha256(sessionToken)}`.catch(() => undefined);
}

/** The employee behind a session cookie, while they may still sign in. */
export async function resolveTeamSession(sessionToken: string | undefined): Promise<EorEmployee | null> {
  if (!sessionToken || !hasDatabase()) return null;
  const [row] = await db()<{ employee_id: string }[]>`
    SELECT s.employee_id FROM ensaar_team_sessions s JOIN ensaar_eor_employees e ON e.id = s.employee_id
    WHERE s.token_hash = ${sha256(sessionToken)} AND s.expires_at > NOW() AND e.status IN ${db()(CAN_SIGN_IN)}
  `.catch(() => [] as { employee_id: string }[]);
  return row ? getEmployee(row.employee_id) : null;
}

/** The one gate every employee portal API route uses: same-origin for changes, and a live session. */
export async function requireTeam(request: {
  method?: string;
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<{ ok: true; employee: EorEmployee } | { ok: false; response: NextResponse }> {
  if (!sameOriginMutation(request)) return { ok: false, response: NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 }) };
  const employee = await resolveTeamSession(request.cookies.get(TEAM_COOKIE)?.value);
  if (!employee || !employee.employeeEmail) return { ok: false, response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  return { ok: true, employee };
}

export function teamCookie(value: string, maxAgeSeconds = PORTAL_SESSION_DAYS * 24 * 60 * 60) {
  return { name: TEAM_COOKIE, value, httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: maxAgeSeconds };
}
