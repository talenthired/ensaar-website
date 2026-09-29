import 'server-only';

import { randomUUID } from 'node:crypto';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { hashPassword, verifyPassword } from './password';
import type { Role } from './roles';

export type BasecampUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  hasPassword: boolean;
};

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  password_hash: string | null;
};

function toUser(row: Row): BasecampUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    active: row.active,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    hasPassword: Boolean(row.password_hash),
  };
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

let dummy: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummy ??= hashPassword('not-a-real-password-for-timing-only');
  return dummy;
}

export async function listUsers(): Promise<BasecampUser[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<Row[]>`
    SELECT id, email, name, role, active, last_login_at, created_at, password_hash
    FROM ensaar_users
    ORDER BY created_at ASC
  `;
  return rows.map(toUser);
}

export async function getUserById(id: string): Promise<BasecampUser | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<Row[]>`
    SELECT id, email, name, role, active, last_login_at, created_at, password_hash
    FROM ensaar_users WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<BasecampUser | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<Row[]>`
    SELECT id, email, name, role, active, last_login_at, created_at, password_hash
    FROM ensaar_users WHERE email = ${normalizeEmail(email)} LIMIT 1
  `;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function countUsers(): Promise<number> {
  if (!hasDatabase()) return 0;
  const [row] = await db()<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ensaar_users`;
  return row?.count ?? 0;
}

/** Owners still able to sign in. Used to refuse removing the last one. */
export async function countActiveOwners(): Promise<number> {
  if (!hasDatabase()) return 0;
  const [row] = await db()<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ensaar_users WHERE role = 'owner' AND active = TRUE
  `;
  return row?.count ?? 0;
}

export async function createUser(input: {
  email: string;
  name?: string | null;
  role: Role;
  password?: string | null;
}): Promise<BasecampUser> {
  const sql = requireDatabase();
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const rows = await sql<Row[]>`
    INSERT INTO ensaar_users (id, email, name, role, password_hash)
    VALUES (${randomUUID()}, ${normalizeEmail(input.email)}, ${input.name ?? null}, ${input.role}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, ensaar_users.name),
      role = EXCLUDED.role,
      password_hash = COALESCE(EXCLUDED.password_hash, ensaar_users.password_hash),
      active = TRUE,
      updated_at = NOW()
    RETURNING id, email, name, role, active, last_login_at, created_at, password_hash
  `;
  return toUser(rows[0]!);
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  await requireDatabase()`UPDATE ensaar_users SET role = ${role}, updated_at = NOW() WHERE id = ${id}`;
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  const sql = requireDatabase();
  await sql`UPDATE ensaar_users SET active = ${active}, updated_at = NOW() WHERE id = ${id}`;
  // A deactivated account must lose its live sessions immediately, otherwise it
  // keeps working until the cookie expires.
  if (!active) await sql`DELETE FROM ensaar_sessions WHERE user_id = ${id}`;
}

export async function setUserPassword(id: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await requireDatabase()`
    UPDATE ensaar_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function recordLogin(id: string): Promise<void> {
  if (!hasDatabase()) return;
  await db()`UPDATE ensaar_users SET last_login_at = NOW() WHERE id = ${id}`.catch(() => undefined);
}

/**
 * Verify an email and password pair.
 *
 * Returns null for every failure without distinguishing "no such account", "no
 * password set" and "wrong password", so this cannot be used to work out who has
 * an account. A deactivated user is refused here too, so deactivation cannot be
 * outlived by a password.
 */
export async function verifyUserPassword(email: string, password: string): Promise<BasecampUser | null> {
  if (!hasDatabase() || !email || !password) return null;
  const rows = await db()<Row[]>`
    SELECT id, email, name, role, active, last_login_at, created_at, password_hash
    FROM ensaar_users WHERE email = ${normalizeEmail(email)} LIMIT 1
  `;
  const row = rows[0];
  // Always run scrypt, against a dummy hash when there is no usable one, so the
  // response time does not reveal which emails have accounts.
  const matches = await verifyPassword(password, row?.password_hash ?? (await dummyHash()));
  if (!row || !matches || !row.active) return null;
  return toUser(row);
}
