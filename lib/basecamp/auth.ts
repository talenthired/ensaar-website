import 'server-only';

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { db, hasDatabase } from '@/lib/db/client';
import { countActiveOwners, getUserById, recordLogin } from './users';
import type { Role } from './roles';

export const BASECAMP_COOKIE = 'ensaar_basecamp';
export const BASECAMP_SESSION_MAX_AGE = 60 * 60 * 8;

/**
 * Sessions belonging to an invited user carry their own version rather than the
 * shared-password one, so rotating the shared password does not sign out every
 * invited user. Their sessions are tied to the user row instead: deactivating an
 * account deletes them (see setUserActive).
 */
const USER_AUTH_VERSION = 'user:v1';

type SessionRecord = {
  tokenHash: string;
  authVersion: string;
  expiresAt: string;
};

const localSessions = new Map<string, SessionRecord>();

function basecampPassword() {
  const configured = process.env.BASECAMP_PASSWORD || process.env.LEAD_PORTAL_PASSWORD;
  if (configured) return configured;
  return process.env.NODE_ENV === 'development' ? 'ensaar-local' : '';
}

function basecampSecret() {
  return process.env.BASECAMP_SECRET || process.env.LEAD_PORTAL_SECRET || basecampPassword();
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function sessionsEndpoint(query = '') {
  return `${process.env.SUPABASE_URL}/rest/v1/ensaar_basecamp_sessions${query}`;
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Rotating the shared password or secret invalidates all outstanding sessions.
function authVersion() {
  return createHash('sha256').update(`${basecampSecret()}\u0000${basecampPassword()}`).digest('hex');
}

function pruneLocalSessions(now = Date.now()) {
  for (const [key, session] of localSessions) {
    if (Date.parse(session.expiresAt) <= now) localSessions.delete(key);
  }
}

/**
 * Whether the shared-password login may be used at all.
 *
 * It exists so the first owner can get in before anyone has been invited. Once a
 * named, active owner exists, it is an unattributable owner-level key to EOR
 * client data (EINs, salaries, signed agreements) that anyone who ever knew the
 * password still holds, so it closes. BASECAMP_ALLOW_SHARED_LOGIN=1 reopens it as
 * a break-glass if every owner is locked out.
 */
export async function sharedLoginAllowed(): Promise<boolean> {
  if (process.env.BASECAMP_ALLOW_SHARED_LOGIN === '1') return true;
  if (!hasDatabase()) return true;
  return (await countActiveOwners().catch(() => 1)) === 0;
}

export function basecampIsConfigured() {
  return Boolean(basecampPassword() && basecampSecret());
}

/**
 * Compare in BYTES, not in JS string length.
 *
 * `'é!'.length` is 2 but its UTF-8 encoding is 3 bytes, so two strings can pass a
 * `.length` check and still reach `timingSafeEqual` with different-sized
 * buffers, which throws. With a non-ASCII password configured, a guess of equal
 * character length turned the login route into a 500 instead of a 401: an
 * unhandled error, and a weak oracle telling an attacker the real password is
 * not plain ASCII. Encoding first makes the length check the same check the
 * comparison needs.
 */
export function verifyBasecampPassword(value: string) {
  const expected = basecampPassword();
  if (!expected) return false;
  const submitted = Buffer.from(String(value ?? ''), 'utf8');
  const secret = Buffer.from(expected, 'utf8');
  if (submitted.length !== secret.length) return false;
  return timingSafeEqual(submitted, secret);
}

/**
 * Issue a random, revocable session reference. Never put credential material in
 * the cookie.
 *
 * userId is optional so the existing shared-password login keeps working exactly
 * as before; that session has no user row and is treated as the bootstrap owner.
 */
export async function createBasecampToken(userId?: string | null): Promise<string> {
  // A user session stands on the user row, so it does not need the shared
  // password to be configured; the bootstrap login still does.
  if (!userId && !basecampIsConfigured()) throw new Error('Basecamp access is not configured.');

  const token = randomBytes(32).toString('base64url');
  const record: SessionRecord = {
    tokenHash: tokenHash(token),
    authVersion: userId ? USER_AUTH_VERSION : authVersion(),
    expiresAt: new Date(Date.now() + BASECAMP_SESSION_MAX_AGE * 1000).toISOString(),
  };

  if (hasDatabase()) {
    await db()`
      INSERT INTO ensaar_sessions (id, token_hash, user_id, auth_version, expires_at)
      VALUES (${randomUUID()}, ${record.tokenHash}, ${userId ?? null}, ${record.authVersion}, ${record.expiresAt})
    `;
    if (userId) await recordLogin(userId);
    return token;
  }

  if (!hasSupabase()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Durable Basecamp session storage is required in production.');
    }
    pruneLocalSessions();
    localSessions.set(record.tokenHash, record);
    return token;
  }

  const response = await fetch(sessionsEndpoint(), {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      token_hash: record.tokenHash,
      auth_version: record.authVersion,
      expires_at: record.expiresAt,
    }),
  });
  if (!response.ok) throw new Error(`Basecamp session creation failed: ${response.status}`);
  return token;
}

/** Verify the server-side session record and its expiry. */
export async function verifyBasecampToken(value?: string): Promise<boolean> {
  if (hasDatabase()) return (await resolveBasecampSession(value)) !== null;
  if (!value || !basecampIsConfigured()) return false;
  const hash = tokenHash(value);
  const version = authVersion();
  const now = new Date().toISOString();

  if (!hasSupabase()) {
    if (process.env.NODE_ENV === 'production') return false;
    pruneLocalSessions();
    const session = localSessions.get(hash);
    return Boolean(session && session.authVersion === version && session.expiresAt > now);
  }

  try {
    const query = `?token_hash=eq.${hash}&auth_version=eq.${version}&expires_at=gt.${encodeURIComponent(now)}&select=id&limit=1`;
    const response = await fetch(sessionsEndpoint(query), { headers: supabaseHeaders(), cache: 'no-store' });
    if (!response.ok) return false;
    const rows = (await response.json()) as Array<{ id: string }>;
    return rows.length === 1;
  } catch {
    return false;
  }
}

export async function revokeBasecampToken(value?: string): Promise<void> {
  if (!value) return;
  const hash = tokenHash(value);
  if (hasDatabase()) {
    await db()`DELETE FROM ensaar_sessions WHERE token_hash = ${hash}`.catch(() => undefined);
    return;
  }
  if (!hasSupabase()) {
    localSessions.delete(hash);
    return;
  }
  await fetch(sessionsEndpoint(`?token_hash=eq.${hash}`), {
    method: 'DELETE',
    headers: supabaseHeaders(),
  }).catch(() => undefined);
}

export type BasecampSession = {
  /** Null for the shared-password bootstrap login, which has no user row. */
  userId: string | null;
  email: string | null;
  name: string | null;
  role: Role;
  /** True when this is the shared-password session rather than an invited user. */
  bootstrap: boolean;
};

/**
 * Resolve the caller behind a session cookie.
 *
 * The shared-password login predates user accounts and still works: it resolves
 * to an owner-level bootstrap session so the panel is reachable before anyone has
 * been invited, and so rotating to per-user accounts is not a flag day. Once
 * invitations exist, that login is how the first owner gets in to send them.
 *
 * A session whose user has been deactivated or deleted resolves to null even if
 * the row survived, so access ends the moment the account does.
 */
export async function resolveBasecampSession(value?: string): Promise<BasecampSession | null> {
  if (!value) return null;

  if (hasDatabase()) {
    const rows = await db()<{ user_id: string | null; auth_version: string }[]>`
      SELECT user_id, auth_version FROM ensaar_sessions
      WHERE token_hash = ${tokenHash(value)} AND expires_at > NOW()
      LIMIT 1
    `.catch(() => [] as { user_id: string | null; auth_version: string }[]);
    const row = rows[0];
    if (!row) return null;

    if (!row.user_id) {
      // Bootstrap session: still tied to the shared credential, so rotating the
      // password or secret invalidates it.
      if (row.auth_version !== authVersion() || !basecampIsConfigured()) return null;
      // Existing shared-login sessions end the moment a named owner exists.
      if (!(await sharedLoginAllowed())) return null;
      return { userId: null, email: null, name: null, role: 'owner', bootstrap: true };
    }

    const user = await getUserById(row.user_id);
    if (!user || !user.active) return null;
    return { userId: user.id, email: user.email, name: user.name, role: user.role, bootstrap: false };
  }

  // Without a database there are no user accounts, so a valid legacy session is
  // the bootstrap owner.
  const ok = await verifyBasecampToken(value);
  return ok ? { userId: null, email: null, name: null, role: 'owner', bootstrap: true } : null;
}
