import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Lead, LeadUpdate, NewLead } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

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
  return `${process.env.SUPABASE_URL}/rest/v1/ensaar_leads${query}`;
}

async function readLocal(): Promise<Lead[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as Lead[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocal(leads: Lead[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

export async function listLeads(): Promise<Lead[]> {
  if (!hasSupabase()) {
    return (await readLocal()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const response = await fetch(
    supabaseEndpoint('?select=payload&order=created_at.desc'),
    { headers: supabaseHeaders(), cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`Supabase list failed: ${response.status}`);
  const rows = (await response.json()) as Array<{ payload: Lead }>;
  return rows.map((row) => row.payload);
}

export async function createLead(input: NewLead): Promise<Lead> {
  // Never silently drop a lead in production. Require durable Supabase storage on
  // ANY production host (Vercel or self-hosted), not only Vercel: the local-file
  // fallback is ephemeral and would lose the primary conversion without an error.
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && !hasSupabase()) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production.');
  }

  const now = new Date().toISOString();
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
  };

  if (!hasSupabase()) {
    const leads = await readLocal();
    leads.unshift(lead);
    await writeLocal(leads);
    return lead;
  }

  const response = await fetch(supabaseEndpoint(), {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ id: lead.id, payload: lead, created_at: now, updated_at: now }),
  });
  if (!response.ok) throw new Error(`Supabase create failed: ${response.status}`);
  return lead;
}

export async function updateLead(id: string, update: LeadUpdate): Promise<Lead | null> {
  if (!hasSupabase()) {
    const leads = await readLocal();
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return null;
    const next = { ...leads[index], ...update, id, updatedAt: new Date().toISOString() };
    leads[index] = next;
    await writeLocal(leads);
    return next;
  }

  const findResponse = await fetch(
    supabaseEndpoint(`?id=eq.${encodeURIComponent(id)}&select=payload&limit=1`),
    { headers: supabaseHeaders(), cache: 'no-store' },
  );
  if (!findResponse.ok) throw new Error(`Supabase find failed: ${findResponse.status}`);
  const rows = (await findResponse.json()) as Array<{ payload: Lead }>;
  if (!rows[0]) return null;

  const next = { ...rows[0].payload, ...update, id, updatedAt: new Date().toISOString() };
  const updateResponse = await fetch(
    supabaseEndpoint(`?id=eq.${encodeURIComponent(id)}`),
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ payload: next, updated_at: next.updatedAt }),
    },
  );
  if (!updateResponse.ok) throw new Error(`Supabase update failed: ${updateResponse.status}`);
  return next;
}
