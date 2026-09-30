import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { NextResponse } from 'next/server';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { sameOriginMutation } from '@/lib/basecamp/guard';
import { enqueue } from '@/lib/notify/outbox';
import { loginEmail, portalAuthLink, portalInviteEmail, portalUrl, signRequestEmail } from './email';
import { INVITE_LINK_TTL_DAYS, LOGIN_LINK_TTL_MINUTES, PORTAL_SESSION_DAYS, type CompanyStatus } from './onboarding';

/*
 * The customer portal's sign-in. There are no passwords: a person proves they
 * control their mailbox by using a one-time link sent to it. That same proof is
 * what makes a signature attributable, so the signatory signs as themselves
 * rather than as "whoever holds the link".
 *
 * Only hashes of link and session tokens are stored.
 */

export const PORTAL_COOKIE = 'ensaar_portal';
type Executor = postgres.Sql | postgres.TransactionSql;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export type PortalUser = {
  id: string;
  companyId: string;
  email: string;
  name: string | null;
  role: 'contact' | 'signatory';
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UserRow = {
  id: string;
  company_id: string;
  email: string;
  name: string | null;
  role: 'contact' | 'signatory';
  active: boolean;
  last_login_at: Date | null;
  created_at: Date;
};

const toUser = (r: UserRow): PortalUser => ({
  id: r.id,
  companyId: r.company_id,
  email: r.email,
  name: r.name,
  role: r.role,
  active: r.active,
  lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

export async function listPortalUsers(companyId: string, sql: Executor = db()): Promise<PortalUser[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<UserRow[]>`
    SELECT id, company_id, email, name, role, active, last_login_at, created_at
    FROM ensaar_portal_users WHERE company_id = ${companyId} ORDER BY created_at
  `;
  return rows.map(toUser);
}

/** Active portal users' addresses: who hears about their company. */
export async function companyRecipients(sql: Executor, companyId: string): Promise<string[]> {
  const rows = await sql<{ email: string }[]>`
    SELECT email FROM ensaar_portal_users WHERE company_id = ${companyId} AND active = TRUE
  `;
  return rows.map((r) => r.email);
}

/**
 * Add (or reactivate) a person and email them an invitation. A person who was
 * already active is left as they are and not re-invited. The signatory role is
 * sticky: naming someone signatory never demotes them.
 *
 * `notify: false` gives access without the email, for when Ensaar is doing the
 * onboarding for the customer and will ask them to sign once it is ready.
 */
export async function ensurePortalUser(
  tx: Executor,
  input: { companyId: string; companyName: string; email: string; name: string | null; role: 'contact' | 'signatory'; notify?: boolean },
): Promise<{ user: PortalUser; invited: boolean }> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await tx<UserRow[]>`
    SELECT id, company_id, email, name, role, active, last_login_at, created_at FROM ensaar_portal_users
    WHERE company_id = ${input.companyId} AND lower(email) = ${email}
  `;
  if (existing?.active && (existing.role === 'signatory' || input.role === 'contact')) {
    return { user: toUser(existing), invited: false };
  }
  const rows = existing
    ? await tx<UserRow[]>`
        UPDATE ensaar_portal_users SET active = TRUE, name = COALESCE(${input.name}, name),
          role = CASE WHEN role = 'signatory' OR ${input.role} = 'signatory' THEN 'signatory' ELSE 'contact' END
        WHERE id = ${existing.id}
        RETURNING id, company_id, email, name, role, active, last_login_at, created_at
      `
    : await tx<UserRow[]>`
        INSERT INTO ensaar_portal_users (id, company_id, email, name, role)
        VALUES (${randomUUID()}, ${input.companyId}, ${email}, ${input.name}, ${input.role})
        RETURNING id, company_id, email, name, role, active, last_login_at, created_at
      `;
  const user = toUser(rows[0]!);
  if (input.notify === false) return { user, invited: false };
  // An existing active contact newly named signatory is told, but needs no new link to sign in.
  const alreadyIn = Boolean(existing?.active);
  const link = alreadyIn ? null : await createLoginLink(tx, user.id, 'invite');
  await enqueue(tx, {
    kind: 'portal.invite',
    to: [user.email],
    relatedId: input.companyId,
    ...portalInviteEmail({
      name: user.name,
      companyName: input.companyName,
      // Already signed in before: point them at the normal sign-in page.
      link: link ?? portalUrl(),
      signatory: user.role === 'signatory',
    }),
  });
  return { user, invited: true };
}

async function createLoginLink(tx: Executor, userId: string, purpose: 'invite' | 'login'): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const ttlMinutes = purpose === 'invite' ? INVITE_LINK_TTL_DAYS * 24 * 60 : LOGIN_LINK_TTL_MINUTES;
  await tx`
    INSERT INTO ensaar_portal_login_tokens (id, user_id, token_hash, purpose, expires_at)
    VALUES (${randomUUID()}, ${userId}, ${sha256(token)}, ${purpose}, NOW() + make_interval(mins => ${ttlMinutes}))
  `;
  return portalAuthLink(token);
}

/**
 * Ask the signatory to review and sign, with a fresh sign-in link. Returned so
 * staff can pass it on directly if email is not working.
 */
export async function requestSignature(
  tx: Executor,
  input: { companyId: string; companyName: string; email: string; name: string; assisted: boolean },
): Promise<string> {
  const { user } = await ensurePortalUser(tx, { ...input, role: 'signatory', notify: false });
  const link = await createLoginLink(tx, user.id, 'invite');
  await enqueue(tx, {
    kind: 'portal.sign_request',
    to: [user.email],
    relatedId: input.companyId,
    ...signRequestEmail({ name: user.name ?? input.name, companyName: input.companyName, link, assisted: input.assisted }),
  });
  return link;
}

/** A fresh invitation link for one person (staff "resend"). Returned so staff can copy it if email fails. */
export async function reinvitePortalUser(companyId: string, userId: string): Promise<string | null> {
  return requireDatabase().begin(async (tx) => {
    const [row] = await tx<(UserRow & { company_name: string; legal_name: string | null })[]>`
      SELECT u.id, u.company_id, u.email, u.name, u.role, u.active, u.last_login_at, u.created_at,
             c.company_name, c.company->>'legalName' AS legal_name
      FROM ensaar_portal_users u JOIN ensaar_eor_companies c ON c.id = u.company_id
      WHERE u.id = ${userId} AND u.company_id = ${companyId} AND u.active = TRUE AND c.status <> 'cancelled'
    `;
    if (!row) return null;
    const link = await createLoginLink(tx, row.id, 'invite');
    await enqueue(tx, {
      kind: 'portal.invite',
      to: [row.email],
      relatedId: companyId,
      ...portalInviteEmail({ name: row.name, companyName: row.legal_name ?? row.company_name, link, signatory: row.role === 'signatory' }),
    });
    return link;
  });
}

export async function deactivatePortalUser(companyId: string, userId: string): Promise<boolean> {
  return requireDatabase().begin(async (tx) => {
    const rows = await tx`UPDATE ensaar_portal_users SET active = FALSE WHERE id = ${userId} AND company_id = ${companyId} RETURNING id`;
    // Access ends now, not when the session cookie expires.
    await tx`DELETE FROM ensaar_portal_sessions WHERE user_id = ${userId}`;
    return rows.length > 0;
  });
}

/**
 * Email a sign-in link to every active portal account for this address. The
 * caller answers the same way whether or not any matched.
 */
export async function requestLogin(email: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const address = email.trim().toLowerCase();
  const sql = db();
  const users = await sql<(UserRow & { company_name: string; legal_name: string | null })[]>`
    SELECT u.id, u.company_id, u.email, u.name, u.role, u.active, u.last_login_at, u.created_at,
           c.company_name, c.company->>'legalName' AS legal_name
    FROM ensaar_portal_users u JOIN ensaar_eor_companies c ON c.id = u.company_id
    WHERE lower(u.email) = ${address} AND u.active = TRUE AND c.status <> 'cancelled'
    LIMIT 10
  `;
  for (const user of users) {
    await sql.begin(async (tx) => {
      const link = await createLoginLink(tx, user.id, 'login');
      await enqueue(tx, {
        kind: 'portal.login',
        to: [user.email],
        relatedId: user.company_id,
        ...loginEmail({ name: user.name, companyName: user.legal_name ?? user.company_name, link }),
      });
    });
  }
  return users.length;
}

/**
 * Exchange a one-time link for a session. The claim is a conditional UPDATE, so
 * a link can be used once even if it is opened twice at the same moment.
 */
export async function consumeLoginToken(token: string): Promise<{ sessionToken: string; user: PortalUser } | null> {
  if (!hasDatabase() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db().begin(async (tx) => {
    const [claimed] = await tx<{ user_id: string }[]>`
      UPDATE ensaar_portal_login_tokens SET used_at = NOW()
      WHERE token_hash = ${sha256(token)} AND used_at IS NULL AND expires_at > NOW()
      RETURNING user_id
    `;
    if (!claimed) return null;
    const [row] = await tx<UserRow[]>`
      SELECT u.id, u.company_id, u.email, u.name, u.role, u.active, u.last_login_at, u.created_at
      FROM ensaar_portal_users u JOIN ensaar_eor_companies c ON c.id = u.company_id
      WHERE u.id = ${claimed.user_id} AND u.active = TRUE AND c.status <> 'cancelled'
    `;
    if (!row) return null;
    const sessionToken = randomBytes(32).toString('base64url');
    await tx`
      INSERT INTO ensaar_portal_sessions (id, user_id, token_hash, expires_at)
      VALUES (${randomUUID()}, ${row.id}, ${sha256(sessionToken)}, NOW() + make_interval(days => ${PORTAL_SESSION_DAYS}))
    `;
    await tx`UPDATE ensaar_portal_users SET last_login_at = NOW() WHERE id = ${row.id}`;
    // Opportunistic cleanup of this person's dead links and sessions.
    await tx`DELETE FROM ensaar_portal_login_tokens WHERE user_id = ${row.id} AND (used_at IS NOT NULL OR expires_at < NOW())`;
    await tx`DELETE FROM ensaar_portal_sessions WHERE user_id = ${row.id} AND expires_at < NOW()`;
    return { sessionToken, user: toUser(row) };
  });
}

export async function revokePortalSession(sessionToken: string | undefined): Promise<void> {
  if (!sessionToken || !hasDatabase()) return;
  await db()`DELETE FROM ensaar_portal_sessions WHERE token_hash = ${sha256(sessionToken)}`.catch(() => undefined);
}

export type PortalContext = {
  user: PortalUser;
  companyId: string;
  companyStatus: CompanyStatus;
};

/** The person behind a session cookie, while they and their company are active. */
export async function resolvePortalSession(sessionToken: string | undefined): Promise<PortalContext | null> {
  if (!sessionToken || !hasDatabase()) return null;
  const [row] = await db()<(UserRow & { company_status: CompanyStatus })[]>`
    SELECT u.id, u.company_id, u.email, u.name, u.role, u.active, u.last_login_at, u.created_at, c.status AS company_status
    FROM ensaar_portal_sessions s
    JOIN ensaar_portal_users u ON u.id = s.user_id
    JOIN ensaar_eor_companies c ON c.id = u.company_id
    WHERE s.token_hash = ${sha256(sessionToken)} AND s.expires_at > NOW() AND u.active = TRUE AND c.status <> 'cancelled'
    LIMIT 1
  `.catch(() => [] as (UserRow & { company_status: CompanyStatus })[]);
  return row ? { user: toUser(row), companyId: row.company_id, companyStatus: row.company_status } : null;
}

/**
 * The one gate every portal API route uses. Changing requests must also come
 * from ensaar.com itself (the cookie is SameSite=Lax so links from email work,
 * which is why the Origin check matters here).
 */
export async function requirePortal(request: {
  method?: string;
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<{ ok: true; ctx: PortalContext } | { ok: false; response: NextResponse }> {
  if (!sameOriginMutation(request)) {
    return { ok: false, response: NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 }) };
  }
  const ctx = await resolvePortalSession(request.cookies.get(PORTAL_COOKIE)?.value);
  if (!ctx) return { ok: false, response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  return { ok: true, ctx };
}

export function sessionCookie(value: string, maxAgeSeconds = PORTAL_SESSION_DAYS * 24 * 60 * 60) {
  return {
    name: PORTAL_COOKIE,
    value,
    httpOnly: true,
    // Lax, not Strict: a customer clicking a link to the portal from an email
    // must arrive signed in. Mutations are protected by the Origin check.
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
