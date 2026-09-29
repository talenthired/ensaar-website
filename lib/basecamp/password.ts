import 'server-only';

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Parameters travel with the hash so they can be raised later without invalidating anyone. */
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

/** Why a password is unacceptable, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Choose a password.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (!password.trim()) return 'Choose a password.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

/**
 * Constant-time verification. Returns false rather than throwing on a malformed
 * stored value: a corrupt row must not become a 500 on the sign-in path, and it
 * must not be distinguishable from a wrong password.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || typeof password !== 'string' || !password) return false;
  if (password.length > MAX_PASSWORD_LENGTH) return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const params = { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 };
  if (!Number.isFinite(params.N) || !Number.isFinite(params.r) || !Number.isFinite(params.p)) return false;

  try {
    const expected = Buffer.from(hash!, 'base64');
    const derived = await scrypt(password, Buffer.from(salt!, 'base64'), expected.length, params);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
