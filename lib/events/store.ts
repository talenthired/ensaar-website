import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EVENT_SEED } from '@/lib/content/events';
import { db, hasDatabase } from '@/lib/db/client';
import type { EventRecord, EventUpdate, NewEvent } from './types';
import { isUpcoming } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'events.json');

// Mirrors lib/leads/store.ts: a local JSON file for development, Supabase REST for any
// real deployment. Same table shape (id + jsonb payload) so both live behind one schema.
function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function supabaseEndpoint(query = '') {
  return `${process.env.SUPABASE_URL}/rest/v1/ensaar_events${query}`;
}

/** Writes must be durable. The local file is ephemeral on a serverless host. */
function requireDurableStore() {
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && !hasDatabase() && !hasSupabase()) {
    throw new Error('DATABASE_URL (or Supabase) is required for event writes in production.');
  }
}

async function readLocal(): Promise<EventRecord[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as EventRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocal(events: EventRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function sortByDate(events: EventRecord[]) {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * The events that shipped as a hard-coded array before Basecamp existed. Seeding keeps
 * the public page identical on first run instead of going blank. Seed rows reuse their
 * original slugs as ids, so re-seeding an already-seeded store is a no-op.
 */
async function seedIfEmpty(existing: EventRecord[]): Promise<EventRecord[]> {
  if (existing.length > 0 || EVENT_SEED.length === 0) return existing;

  const seeded = EVENT_SEED.map((event) => ({
    ...event,
    published: true,
    createdAt: `${event.date}T00:00:00.000Z`,
    updatedAt: `${event.date}T00:00:00.000Z`,
  }));

  if (hasDatabase()) {
    // Idempotent: a re-seed collides on the primary key and does nothing, so the
    // originally seeded rows keep any edits made in Basecamp.
    for (const event of seeded) {
      await db()`
        INSERT INTO ensaar_events (id, date, title, type, location, summary, href, speakers, published, capacity, created_at, updated_at)
        VALUES (${event.id}, ${event.date}, ${event.title}, ${event.type}, ${event.location},
                ${event.summary}, ${event.href ?? null}, ${db().array(event.speakers ?? [])},
                ${event.published}, ${(event as { capacity?: number | null }).capacity ?? null}, ${event.createdAt}, ${event.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    return sortByDate(seeded);
  }

  if (!hasSupabase()) {
    // In production without Supabase the file is not writable in any durable sense, so
    // serve the seed in memory rather than failing the public page.
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') return sortByDate(seeded);
    await writeLocal(seeded);
    return sortByDate(seeded);
  }

  const response = await fetch(supabaseEndpoint(), {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      // Idempotent: a second seed collides on the primary key and merges instead of duplicating.
      Prefer: 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify(
      seeded.map((event) => ({
        id: event.id,
        payload: event,
        created_at: event.createdAt,
        updated_at: event.updatedAt,
      })),
    ),
  });
  if (!response.ok) throw new Error(`Supabase seed failed: ${response.status}`);
  return sortByDate(seeded);
}

type EventRow = {
  id: string; date: string; title: string; type: string; location: string; summary: string;
  href: string | null; speakers: string[]; published: boolean; capacity: number | null;
  created_at: Date; updated_at: Date;
};

function toEvent(row: EventRow): EventRecord {
  return {
    id: row.id, date: row.date, title: row.title, type: row.type as EventRecord['type'],
    location: row.location, summary: row.summary, href: row.href ?? undefined,
    speakers: row.speakers ?? [], published: row.published, capacity: row.capacity,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
  };
}

export async function listEvents(): Promise<EventRecord[]> {
  if (hasDatabase()) {
    const rows = await db()<EventRow[]>`
      SELECT id, date, title, type, location, summary, href, speakers, published, capacity,
             created_at, updated_at
      FROM ensaar_events ORDER BY date DESC
    `;
    return seedIfEmpty(rows.map(toEvent));
  }
  if (!hasSupabase()) {
    return seedIfEmpty(sortByDate(await readLocal()));
  }

  const response = await fetch(supabaseEndpoint('?select=payload&order=created_at.desc'), {
    headers: supabaseHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Supabase list failed: ${response.status}`);
  const rows = (await response.json()) as Array<{ payload: EventRecord }>;
  return seedIfEmpty(sortByDate(rows.map((row) => row.payload)));
}

/** What the public /events page renders: published only, split by date. */
export async function listPublishedEvents() {
  const events = (await listEvents()).filter((event) => event.published);
  return {
    upcoming: events.filter((event) => isUpcoming(event)).sort((a, b) => a.date.localeCompare(b.date)),
    past: events.filter((event) => !isUpcoming(event)).sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function createEvent(input: NewEvent): Promise<EventRecord> {
  requireDurableStore();

  const now = new Date().toISOString();
  const event: EventRecord = {
    ...input,
    id: crypto.randomUUID(),
    published: input.published ?? false,
    createdAt: now,
    updatedAt: now,
  };

  if (hasDatabase()) {
    const rows = await db()<EventRow[]>`
      INSERT INTO ensaar_events (id, date, title, type, location, summary, href, speakers, published, capacity)
      VALUES (${event.id}, ${event.date}, ${event.title}, ${event.type}, ${event.location},
              ${event.summary}, ${event.href ?? null}, ${db().array(event.speakers ?? [])},
              ${event.published}, ${event.capacity ?? null})
      RETURNING id, date, title, type, location, summary, href, speakers, published, capacity,
                created_at, updated_at
    `;
    return toEvent(rows[0]!);
  }

  if (!hasSupabase()) {
    const events = await listEvents();
    await writeLocal([event, ...events]);
    return event;
  }

  const response = await fetch(supabaseEndpoint(), {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ id: event.id, payload: event, created_at: now, updated_at: now }),
  });
  if (!response.ok) throw new Error(`Supabase create failed: ${response.status}`);
  return event;
}

export async function updateEvent(id: string, update: EventUpdate): Promise<EventRecord | null> {
  requireDurableStore();

  if (hasDatabase()) {
    /* Build the SET list from only the keys the caller supplied. A COALESCE-per
       column cannot express this: href and capacity are legitimately nullable, so
       "null" means "clear it", not "leave it alone", and the two cases have to be
       distinguishable. postgres.js writes the column list for us and parameterises
       every value. */
    const patch: Record<string, unknown> = {};
    if (update.date !== undefined) patch.date = update.date;
    if (update.title !== undefined) patch.title = update.title;
    if (update.type !== undefined) patch.type = update.type;
    if (update.location !== undefined) patch.location = update.location;
    if (update.summary !== undefined) patch.summary = update.summary;
    if (update.href !== undefined) patch.href = update.href ?? null;
    if (update.speakers !== undefined) patch.speakers = update.speakers ?? [];
    if (update.published !== undefined) patch.published = update.published;
    if (update.capacity !== undefined) patch.capacity = update.capacity ?? null;
    patch.updated_at = new Date();

    const sql = db();
    const rows = await sql<EventRow[]>`
      UPDATE ensaar_events SET ${sql(patch, ...Object.keys(patch))}
      WHERE id = ${id}
      RETURNING id, date, title, type, location, summary, href, speakers, published, capacity,
                created_at, updated_at
    `;
    return rows[0] ? toEvent(rows[0]) : null;
  }

  if (!hasSupabase()) {
    const events = await listEvents();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) return null;
    const next = { ...events[index], ...update, id, updatedAt: new Date().toISOString() };
    events[index] = next;
    await writeLocal(events);
    return next;
  }

  const findResponse = await fetch(
    supabaseEndpoint(`?id=eq.${encodeURIComponent(id)}&select=payload&limit=1`),
    { headers: supabaseHeaders(), cache: 'no-store' },
  );
  if (!findResponse.ok) throw new Error(`Supabase find failed: ${findResponse.status}`);
  const rows = (await findResponse.json()) as Array<{ payload: EventRecord }>;
  if (!rows[0]) return null;

  const next = { ...rows[0].payload, ...update, id, updatedAt: new Date().toISOString() };
  const updateResponse = await fetch(supabaseEndpoint(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ payload: next, updated_at: next.updatedAt }),
  });
  if (!updateResponse.ok) throw new Error(`Supabase update failed: ${updateResponse.status}`);
  return next;
}

export async function deleteEvent(id: string): Promise<boolean> {
  requireDurableStore();

  if (hasDatabase()) {
    const rows = await db()<{ id: string }[]>`DELETE FROM ensaar_events WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }

  if (!hasSupabase()) {
    const events = await listEvents();
    const next = events.filter((event) => event.id !== id);
    if (next.length === events.length) return false;
    await writeLocal(next);
    return true;
  }

  const response = await fetch(supabaseEndpoint(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
  });
  if (!response.ok) throw new Error(`Supabase delete failed: ${response.status}`);
  const removed = (await response.json()) as unknown[];
  return removed.length > 0;
}
