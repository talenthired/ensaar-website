import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EVENT_SEED } from '@/lib/content/events';
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
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && !hasSupabase()) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production.');
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

export async function listEvents(): Promise<EventRecord[]> {
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
