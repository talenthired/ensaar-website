import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { createUser, normalizeEmail, type BasecampUser } from './users';
import { passwordProblem } from './password';
import type { Role } from './roles';

/** Long enough that a stale link stops being useful, short enough to survive a slow inbox. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  invitedBy: string | null;
  invitedByEmail: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Derived, so the UI does not re-implement the expiry rule. */
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

type Row = {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  invited_by_email: string | null;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
};

/** Only the hash is stored, so reading the table does not let anyone accept an invite. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toInvitation(row: Row): Invitation {
  const expired = row.expires_at.getTime() <= Date.now();
  const status: Invitation['status'] = row.accepted_at
    ? 'accepted'
    : row.revoked_at
      ? 'revoked'
      : expired
        ? 'expired'
        : 'pending';
  return {
    id: row.id,
    email: row.email,
    role: row.role as Role,
    invitedBy: row.invited_by,
    invitedByEmail: row.invited_by_email,
    expiresAt: row.expires_at.toISOString(),
    acceptedAt: row.accepted_at ? row.accepted_at.toISOString() : null,
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    status,
  };
}

export async function listInvitations(): Promise<Invitation[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<Row[]>`
    SELECT i.id, i.email, i.role, i.invited_by, u.email AS invited_by_email,
           i.expires_at, i.accepted_at, i.revoked_at, i.created_at
    FROM ensaar_invitations i
    LEFT JOIN ensaar_users u ON u.id = i.invited_by
    ORDER BY i.created_at DESC
    LIMIT 200
  `;
  return rows.map(toInvitation);
}

/**
 * Invite someone, returning the raw token exactly once.
 *
 * Re-inviting an address supersedes the outstanding invitation rather than
 * creating a second one (the partial unique index enforces this), so the most
 * recent link is always the only live one and revoking is unambiguous.
 */
export async function createInvitation(input: {
  email: string;
  role: Role;
  invitedBy: string | null;
}): Promise<{ invitation: Invitation; token: string }> {
  const sql = requireDatabase();
  const email = normalizeEmail(input.email);
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  await sql`
    UPDATE ensaar_invitations SET revoked_at = NOW()
    WHERE email = ${email} AND accepted_at IS NULL AND revoked_at IS NULL
  `;
  const rows = await sql<Row[]>`
    INSERT INTO ensaar_invitations (id, email, role, token_hash, invited_by, expires_at)
    VALUES (${randomUUID()}, ${email}, ${input.role}, ${hashToken(token)}, ${input.invitedBy}, ${expiresAt})
    RETURNING id, email, role, invited_by, NULL::text AS invited_by_email,
              expires_at, accepted_at, revoked_at, created_at
  `;
  return { invitation: toInvitation(rows[0]!), token };
}

/** The invitation a token refers to, only while it is still usable. */
export async function getUsableInvitation(token: string): Promise<Invitation | null> {
  if (!hasDatabase() || !token) return null;
  const rows = await db()<Row[]>`
    SELECT id, email, role, invited_by, NULL::text AS invited_by_email,
           expires_at, accepted_at, revoked_at, created_at
    FROM ensaar_invitations
    WHERE token_hash = ${hashToken(token)}
      AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ? toInvitation(rows[0]) : null;
}

export async function revokeInvitation(id: string): Promise<void> {
  await requireDatabase()`
    UPDATE ensaar_invitations SET revoked_at = NOW()
    WHERE id = ${id} AND accepted_at IS NULL AND revoked_at IS NULL
  `;
}

export type AcceptResult =
  | { ok: true; user: BasecampUser }
  | { ok: false; error: string };

/**
 * Accept an invitation and create the account.
 *
 * The claim is a conditional UPDATE, so two people racing the same link produce
 * exactly one account: the second update matches zero rows and is refused rather
 * than silently resetting the first person's password.
 */
export async function acceptInvitation(
  token: string,
  input: { name?: string | null; password: string },
): Promise<AcceptResult> {
  const sql = requireDatabase();
  const problem = passwordProblem(input.password);
  if (problem) return { ok: false, error: problem };

  const claimed = await sql<Row[]>`
    UPDATE ensaar_invitations SET accepted_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
    RETURNING id, email, role, invited_by, NULL::text AS invited_by_email,
              expires_at, accepted_at, revoked_at, created_at
  `;
  const row = claimed[0];
  if (!row) return { ok: false, error: 'That invitation is no longer valid.' };

  const user = await createUser({
    email: row.email,
    name: input.name ?? null,
    role: row.role as Role,
    password: input.password,
  });
  return { ok: true, user };
}
