import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const BASECAMP_COOKIE = 'ensaar_basecamp';
export const BASECAMP_SESSION_MAX_AGE = 60 * 60 * 8;

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

/** Issue a random, revocable session reference. Never put credential material in the cookie. */
export async function createBasecampToken(): Promise<string> {
  if (!basecampIsConfigured()) throw new Error('Basecamp access is not configured.');

  const token = randomBytes(32).toString('base64url');
  const record: SessionRecord = {
    tokenHash: tokenHash(token),
    authVersion: authVersion(),
    expiresAt: new Date(Date.now() + BASECAMP_SESSION_MAX_AGE * 1000).toISOString(),
  };

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
  if (!hasSupabase()) {
    localSessions.delete(hash);
    return;
  }
  await fetch(sessionsEndpoint(`?token_hash=eq.${hash}`), {
    method: 'DELETE',
    headers: supabaseHeaders(),
  }).catch(() => undefined);
}
