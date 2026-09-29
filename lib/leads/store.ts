import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db, hasDatabase } from '@/lib/db/client';
import { deliverSoon, enqueue, renderEmail, staffRecipients } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import type { Lead, LeadUpdate, NewLead } from './types';

/*
 * Backends, in order: Postgres (DATABASE_URL), then Supabase, then a local file
 * in development. Production on Railway has Postgres and no Supabase; before
 * this branch existed every lead there was refused with a 503.
 */

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

function leadNotification(lead: Lead) {
  const who = [lead.name, lead.company].filter(Boolean).join(', ');
  return renderEmail({
    eyebrow: 'New enquiry on ensaar.com',
    heading: `${who || lead.email}: ${lead.workType}`,
    paragraphs: [
      `From ${lead.name} <${lead.email}>${lead.phone ? `, ${lead.phone}` : ''}${lead.company ? ` at ${lead.company}` : ''}.`,
      lead.details,
      [lead.leadSource && `Source: ${lead.leadSource}`, lead.sourcePath && `Page: ${lead.sourcePath}`, lead.utmSource && `UTM: ${lead.utmSource}/${lead.utmMedium ?? ''}/${lead.utmCampaign ?? ''}`]
        .filter(Boolean)
        .join('\n'),
    ].filter(Boolean),
    action: { label: 'Open in Basecamp', href: `${siteConfig.url.replace(/\/+$/, '')}/basecamp/leads` },
    footer: 'Reply directly to the person at the address above.',
  });
}

export async function listLeads(): Promise<Lead[]> {
  if (hasDatabase()) {
    const rows = await db()<{ payload: Lead }[]>`
      SELECT payload FROM ensaar_leads ORDER BY created_at DESC LIMIT 1000
    `;
    return rows.map((row) => row.payload);
  }
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
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && !hasDatabase() && !hasSupabase()) {
    throw new Error('DATABASE_URL (or Supabase) is required in production.');
  }

  const now = new Date().toISOString();
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
  };

  if (hasDatabase()) {
    const sql = db();
    // The lead and the staff notification commit together.
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO ensaar_leads (id, status, payload, created_at, updated_at)
        VALUES (${lead.id}, ${lead.status}, ${tx.json(lead as never)}, ${now}, ${now})
      `;
      const message = leadNotification(lead);
      await enqueue(tx, {
        kind: 'lead.new',
        to: await staffRecipients(tx),
        subject: `New enquiry: ${lead.name}${lead.company ? `, ${lead.company}` : ''}`,
        relatedId: lead.id,
        dedupeKey: `lead.new:${lead.id}`,
        ...message,
      });
    });
    await deliverSoon();
    return lead;
  }

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
  if (hasDatabase()) {
    const sql = db();
    return sql.begin(async (tx) => {
      const [row] = await tx<{ payload: Lead }[]>`SELECT payload FROM ensaar_leads WHERE id = ${id} FOR UPDATE`;
      if (!row) return null;
      const next: Lead = { ...row.payload, ...update, id, updatedAt: new Date().toISOString() };
      await tx`
        UPDATE ensaar_leads SET payload = ${tx.json(next as never)}, status = ${next.status}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return next;
    });
  }
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
