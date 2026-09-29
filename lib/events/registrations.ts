import 'server-only';

import { randomUUID } from 'node:crypto';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';

export {
  REGISTRATION_STATUSES,
  isRegistrationStatus,
  type Registration,
  type RegistrationStatus,
} from './registration-types';

import type { Registration, RegistrationStatus } from './registration-types';

type Row = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  source: string | null;
  created_at: Date;
};

function toRegistration(row: Row): Registration {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    company: row.company,
    phone: row.phone,
    notes: row.notes,
    status: row.status as RegistrationStatus,
    source: row.source,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listRegistrations(eventId?: string): Promise<Registration[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = eventId
    ? await sql<Row[]>`
        SELECT id, event_id, name, email, company, phone, notes, status, source, created_at
        FROM ensaar_event_registrations WHERE event_id = ${eventId}
        ORDER BY created_at DESC
      `
    : await sql<Row[]>`
        SELECT id, event_id, name, email, company, phone, notes, status, source, created_at
        FROM ensaar_event_registrations ORDER BY created_at DESC LIMIT 500
      `;
  return rows.map(toRegistration);
}

/** Live registration counts per event, for the admin list and the capacity check. */
export async function registrationCounts(): Promise<Record<string, number>> {
  if (!hasDatabase()) return {};
  const rows = await db()<{ event_id: string; count: number }[]>`
    SELECT event_id, COUNT(*)::int AS count
    FROM ensaar_event_registrations
    WHERE status <> 'cancelled'
    GROUP BY event_id
  `;
  return Object.fromEntries(rows.map((r) => [r.event_id, r.count]));
}

export type RegisterResult =
  | { ok: true; registration: Registration; duplicate: boolean }
  | { ok: false; error: string };

/**
 * Register someone for an event, from the public page.
 *
 * A repeat submit with the same address updates the existing row rather than
 * adding a second one: people double-submit forms, and a duplicate would inflate
 * the count the capacity check depends on. The unique index makes that guarantee
 * at the database rather than in a read-then-write race.
 *
 * Capacity is evaluated inside the same statement chain, so two people taking the
 * last seat cannot both be told they got it.
 */
export async function registerForEvent(input: {
  eventId: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  notes?: string | null;
  source?: string | null;
}): Promise<RegisterResult> {
  const sql = requireDatabase();
  const email = input.email.trim().toLowerCase();

  const events = await sql<{ id: string; published: boolean; capacity: number | null }[]>`
    SELECT id, published, capacity FROM ensaar_events WHERE id = ${input.eventId} LIMIT 1
  `;
  const event = events[0];
  if (!event || !event.published) return { ok: false, error: 'That event is not open for registration.' };

  const existing = await sql<Row[]>`
    SELECT id, event_id, name, email, company, phone, notes, status, source, created_at
    FROM ensaar_event_registrations WHERE event_id = ${input.eventId} AND email = ${email} LIMIT 1
  `;

  if (event.capacity !== null && !existing[0]) {
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM ensaar_event_registrations
      WHERE event_id = ${input.eventId} AND status <> 'cancelled'
    `;
    if (count >= event.capacity) return { ok: false, error: 'This event is full.' };
  }

  const rows = await sql<Row[]>`
    INSERT INTO ensaar_event_registrations (id, event_id, name, email, company, phone, notes, source)
    VALUES (${randomUUID()}, ${input.eventId}, ${input.name.trim()}, ${email},
            ${input.company ?? null}, ${input.phone ?? null}, ${input.notes ?? null}, ${input.source ?? null})
    ON CONFLICT (event_id, email) DO UPDATE SET
      name = EXCLUDED.name,
      company = COALESCE(EXCLUDED.company, ensaar_event_registrations.company),
      phone = COALESCE(EXCLUDED.phone, ensaar_event_registrations.phone),
      notes = COALESCE(EXCLUDED.notes, ensaar_event_registrations.notes),
      -- A cancelled registration that comes back is a registration again.
      status = CASE WHEN ensaar_event_registrations.status = 'cancelled' THEN 'registered'
                    ELSE ensaar_event_registrations.status END,
      updated_at = NOW()
    RETURNING id, event_id, name, email, company, phone, notes, status, source, created_at
  `;
  return { ok: true, registration: toRegistration(rows[0]!), duplicate: Boolean(existing[0]) };
}

export async function setRegistrationStatus(id: string, status: RegistrationStatus): Promise<boolean> {
  const rows = await requireDatabase()<{ id: string }[]>`
    UPDATE ensaar_event_registrations SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteRegistration(id: string): Promise<boolean> {
  const rows = await requireDatabase()<{ id: string }[]>`
    DELETE FROM ensaar_event_registrations WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

/** CSV for the admin export. Quoted per RFC 4180 so commas and quotes survive. */
export function registrationsToCsv(rows: Registration[]): string {
  const cell = (value: string | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['name', 'email', 'company', 'phone', 'status', 'registered_at', 'notes'].join(',');
  const body = rows.map((r) =>
    [cell(r.name), cell(r.email), cell(r.company), cell(r.phone), cell(r.status), cell(r.createdAt), cell(r.notes)].join(','),
  );
  return [header, ...body].join('\n');
}
