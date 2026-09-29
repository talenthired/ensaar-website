import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase } from '@/lib/db/client';
import { siteConfig } from '@/lib/utils';

/**
 * Durable outgoing email.
 *
 * A message is written to ensaar_outbox in the same transaction as the change
 * that caused it (a signature, an approval), so the two cannot disagree: either
 * both happened or neither did. Delivery happens after commit, and anything that
 * fails is retried with backoff and stays visible in Basecamp with its error.
 *
 * Without RESEND_API_KEY a message is marked "skipped" rather than left pending,
 * so it is never delivered days later with a link that has since been rotated.
 */

export type Attachment = { filename: string; content: string; contentType?: string };

export type OutboxMessage = {
  kind: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  relatedId?: string | null;
  /** Same key, same message: enqueueing twice is a no-op. */
  dedupeKey?: string | null;
  attachments?: Attachment[];
};

export type OutboxStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type OutboxEntry = {
  id: string;
  kind: string;
  to: string[];
  subject: string;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

const MAX_ATTEMPTS = 5;

type Executor = postgres.Sql | postgres.TransactionSql;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Where customers reply and who they are told to write to. Defaults to the
 * site contact address (siteConfig.email); EMAIL_REPLY_TO overrides it.
 */
export function supportAddress(): string {
  return process.env.EMAIL_REPLY_TO || siteConfig.email;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || `Ensaar <hello@${new URL(siteConfig.url).hostname}>`;
}

/** Queue a message. Pass the transaction the triggering change runs in. */
export async function enqueue(sql: Executor, message: OutboxMessage): Promise<void> {
  const to = [...new Set(message.to.map((a) => a.trim().toLowerCase()).filter(Boolean))];
  if (to.length === 0) return;
  await sql`
    INSERT INTO ensaar_outbox (id, kind, dedupe_key, related_id, to_addresses, subject, text_body, html_body, attachments)
    VALUES (${randomUUID()}, ${message.kind}, ${message.dedupeKey ?? null}, ${message.relatedId ?? null},
            ${to}, ${message.subject}, ${message.text}, ${message.html},
            ${message.attachments ? sql.json(message.attachments as never) : null})
    ON CONFLICT (dedupe_key) DO NOTHING
  `;
}

type Row = {
  id: string;
  kind: string;
  to_addresses: string[];
  subject: string;
  text_body: string;
  html_body: string;
  attachments: Attachment[] | null;
  attempts: number;
};

async function send(row: Row): Promise<{ ok: true } | { ok: false; error: string; permanent: boolean }> {
  try {
    // RESEND_API_URL exists only so integration tests can point delivery at a local mock.
    const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        // The row id: a retry after an uncertain response cannot send twice.
        'idempotency-key': row.id,
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: row.to_addresses,
        reply_to: supportAddress(),
        subject: row.subject,
        text: row.text_body,
        html: row.html_body,
        attachments: row.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'utf8').toString('base64'),
          content_type: a.contentType,
        })),
      }),
    });
    if (response.ok) return { ok: true };
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    // 4xx other than rate limiting will not fix itself on retry (bad address,
    // unverified domain). Keep retrying 429 and 5xx.
    const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
    return { ok: false, error: `Resend ${response.status}: ${detail}`, permanent };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error', permanent: false };
  }
}

/**
 * Deliver what is due. Safe to call from any request and from several at once:
 * rows are claimed with SKIP LOCKED, so two callers never send the same message.
 */
export async function deliverDue(limit = 10): Promise<{ sent: number; failed: number }> {
  if (!hasDatabase()) return { sent: 0, failed: 0 };
  const sql = db();
  let sent = 0;
  let failed = 0;

  if (!emailConfigured()) {
    await sql`
      UPDATE ensaar_outbox SET status = 'skipped', last_error = 'Email is not configured (RESEND_API_KEY).'
      WHERE status = 'pending'
    `.catch(() => undefined);
    return { sent, failed };
  }

  for (let i = 0; i < limit; i++) {
    const done = await sql.begin(async (tx) => {
      const [row] = await tx<Row[]>`
        SELECT id, kind, to_addresses, subject, text_body, html_body, attachments, attempts
        FROM ensaar_outbox
        WHERE status IN ('pending', 'failed') AND attempts < ${MAX_ATTEMPTS} AND next_attempt_at <= NOW()
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      if (!row) return false;
      const result = await send(row);
      if (result.ok) {
        await tx`UPDATE ensaar_outbox SET status = 'sent', attempts = attempts + 1, sent_at = NOW(), last_error = NULL WHERE id = ${row.id}`;
        // A one-time code has no business sitting readable in the database once delivered.
        if (row.kind === 'eor.verify') {
          await tx`UPDATE ensaar_outbox SET text_body = '[code redacted after delivery]', html_body = '[code redacted after delivery]', subject = 'Ensaar signing code' WHERE id = ${row.id}`;
        }
        sent++;
      } else {
        const attempts = row.attempts + 1;
        const giveUp = result.permanent || attempts >= MAX_ATTEMPTS;
        // 2, 4, 8, 16 minutes.
        const backoffMinutes = 2 ** attempts;
        await tx`
          UPDATE ensaar_outbox SET status = 'failed', attempts = ${giveUp ? MAX_ATTEMPTS : attempts},
            last_error = ${result.error},
            next_attempt_at = NOW() + make_interval(mins => ${backoffMinutes})
          WHERE id = ${row.id}
        `;
        failed++;
      }
      return true;
    });
    if (!done) break;
  }
  return { sent, failed };
}

/** Deliver now without letting a mail problem fail the request that triggered it. */
export async function deliverSoon(): Promise<void> {
  await deliverDue(5).catch((error) => console.error('Outbox delivery failed', error));
}

/** Put a failed or skipped message back in the queue (staff "Retry"). */
export async function retryMessage(id: string): Promise<boolean> {
  const rows = await db()`
    UPDATE ensaar_outbox SET status = 'pending', attempts = 0, next_attempt_at = NOW(), last_error = NULL
    WHERE id = ${id} AND status IN ('failed', 'skipped')
    RETURNING id
  `;
  return rows.length > 0;
}

type ListRow = {
  id: string;
  kind: string;
  to_addresses: string[];
  subject: string;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
  created_at: Date;
  sent_at: Date | null;
};

function toEntry(r: ListRow): OutboxEntry {
  return {
    id: r.id,
    kind: r.kind,
    to: r.to_addresses,
    subject: r.subject,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at.toISOString(),
    sentAt: r.sent_at ? r.sent_at.toISOString() : null,
  };
}

export async function listMessages(relatedId: string): Promise<OutboxEntry[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<ListRow[]>`
    SELECT id, kind, to_addresses, subject, status, attempts, last_error, created_at, sent_at
    FROM ensaar_outbox WHERE related_id = ${relatedId} ORDER BY created_at DESC LIMIT 50
  `;
  return rows.map(toEntry);
}

export async function listUndelivered(limit = 20): Promise<OutboxEntry[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<ListRow[]>`
    SELECT id, kind, to_addresses, subject, status, attempts, last_error, created_at, sent_at
    FROM ensaar_outbox WHERE status IN ('failed', 'skipped')
      AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map(toEntry);
}

/** Who at Ensaar hears about new leads and signatures: active owners and admins, plus EOR_NOTIFY_EMAIL. */
export async function staffRecipients(sql: Executor = db()): Promise<string[]> {
  const extra = (process.env.EOR_NOTIFY_EMAIL ?? '').split(',').map((a) => a.trim()).filter(Boolean);
  const rows = await sql<{ email: string }[]>`
    SELECT email FROM ensaar_users WHERE active = TRUE AND role IN ('owner', 'admin')
  `.catch(() => [] as { email: string }[]);
  return [...new Set([...rows.map((r) => r.email), ...extra])];
}

// --- Rendering ------------------------------------------------------------------

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * One layout for every email. `paragraphs` are plain text (escaped here), so no
 * caller can inject markup by accident.
 */
export function renderEmail(input: {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  footer?: string;
}): { text: string; html: string } {
  const text = [
    input.heading,
    '',
    ...input.paragraphs.flatMap((p) => [p, '']),
    ...(input.action ? [`${input.action.label}: ${input.action.href}`, ''] : []),
    input.footer ?? `Questions? Reply to this email or write to ${supportAddress()}.`,
    '',
    'Ensaar Global',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f7fa;color:#0c2343;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;padding:28px">
    <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5b6b82;margin:0 0 8px">${escapeHtml(input.eyebrow)}</p>
    <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">${escapeHtml(input.heading)}</h1>
    ${input.paragraphs.map((p) => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;white-space:pre-line">${escapeHtml(p)}</p>`).join('\n    ')}
    ${
      input.action
        ? `<p style="margin:20px 0"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;background:#0c2343;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">${escapeHtml(input.action.label)}</a></p>`
        : ''
    }
    <p style="font-size:12px;line-height:1.6;color:#5b6b82;margin:16px 0 0">${escapeHtml(input.footer ?? `Questions? Reply to this email or write to ${supportAddress()}.`)}</p>
  </div>
</body></html>`;
  return { text, html };
}
