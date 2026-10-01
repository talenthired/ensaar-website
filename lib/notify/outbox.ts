import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase } from '@/lib/db/client';
import { siteConfig } from '@/lib/utils';
import { EMPLOYEE_NOT_COPIED, audienceOf, copyFor, withoutSignInLinks, type Audience } from './audience';

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

/** `content` is text, or base64 when `encoding` says so (a PDF, say). */
export type Attachment = { filename: string; content: string; contentType?: string; encoding?: 'base64' };

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

/** Who is Cc'd on employee emails: HR, and EMAIL_CC_EMPLOYEE (Ensaar's signatory). */
export function employeeCc(): string[] {
  const extra = (process.env.EMAIL_CC_EMPLOYEE ?? '').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  return [...new Set([hrAddress().toLowerCase(), ...extra])];
}

/** Where employees write to Ensaar: HR, not client support. */
export function hrAddress(): string {
  return process.env.EMAIL_HR || siteConfig.hrEmail;
}

/** Sender and reply-to by audience: employees hear from HR, everyone else from support. */
function senderFor(audience: Audience): { from: string; replyTo: string } {
  return audience === 'employee' ? { from: `Ensaar HR <${hrAddress()}>`, replyTo: hrAddress() } : { from: fromAddress(), replyTo: supportAddress() };
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

/** One message to Resend. The idempotency key makes a retry after an uncertain response safe. */
async function post(body: Record<string, unknown>, idempotencyKey: string): Promise<{ ok: true } | { ok: false; error: string; permanent: boolean }> {
  try {
    const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
    return { ok: false, error: `Resend ${response.status}: ${detail}`, permanent };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error', permanent: false };
  }
}

/**
 * Deliver one message, from the right address for its audience. A client or
 * employee email is then copied to Ensaar's owners and admins as a separate
 * message (never Cc, so the recipient does not see who else got it), with any
 * one-time sign-in link neutralised. If the copy fails the row is retried; the
 * original is not sent twice, because Resend dedupes on its idempotency key.
 */
async function send(row: Row): Promise<{ ok: true } | { ok: false; error: string; permanent: boolean }> {
  const audience = audienceOf(row.kind);
  const { from, replyTo } = senderFor(audience);
  const attachments = row.attachments?.map((a) => ({
    filename: a.filename,
    content: a.encoding === 'base64' ? a.content : Buffer.from(a.content, 'utf8').toString('base64'),
    content_type: a.contentType,
  }));
  if (audience === 'employee') {
    // Cc'd in the open to HR and the signatory, so HR's inbox keeps the record; never the sign-in link email.
    const cc = EMPLOYEE_NOT_COPIED.has(row.kind) ? [] : employeeCc().filter((a) => !row.to_addresses.includes(a));
    // Belt and braces: whatever is Cc'd never carries a working sign-in link.
    const text = cc.length ? withoutSignInLinks(row.text_body) : row.text_body;
    const html = cc.length ? withoutSignInLinks(row.html_body) : row.html_body;
    return post({ from, to: row.to_addresses, ...(cc.length ? { cc } : {}), reply_to: replyTo, subject: row.subject, text, html, attachments }, row.id);
  }
  const sent = await post({ from, to: row.to_addresses, reply_to: replyTo, subject: row.subject, text: row.text_body, html: row.html_body, attachments }, row.id);
  if (!sent.ok || audience === 'staff') return sent;
  const admins = (await adminRecipients()).filter((a) => !row.to_addresses.includes(a.toLowerCase()));
  if (admins.length === 0) return sent;
  const copy = copyFor({ to: row.to_addresses, subject: row.subject, text: row.text_body, html: row.html_body });
  return post({ from, to: admins, reply_to: replyTo, subject: copy.subject, text: copy.text, html: copy.html, attachments }, `${row.id}:copy`);
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
        -- Scheduled reminders go after everything else: a burst of them must never hold up
        -- a sign-in link (which expires) or a signing request someone is waiting for.
        ORDER BY (kind LIKE '%.scheduled.%'), created_at
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
/** Ensaar's active owners and admins, who are copied on every client and employee email. */
export async function adminRecipients(sql: Executor = db()): Promise<string[]> {
  const rows = await sql<{ email: string }[]>`SELECT email FROM ensaar_users WHERE active = TRUE AND role IN ('owner', 'admin')`.catch(() => [] as { email: string }[]);
  return [...new Set(rows.map((r) => r.email.toLowerCase()))];
}

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

export type EmailContent = {
  /** Small label beside the logo: which part of Ensaar is writing. */
  eyebrow: string;
  /** The address the email tells people to write to: support@ for clients (the default), hr@ for employees. */
  contact?: string;
  heading: string;
  paragraphs: string[];
  /** A highlighted line above the body: a due date approaching, a payment overdue. */
  notice?: { tone: 'info' | 'warning' | 'danger'; text: string };
  /** Label and value rows, for things read at a glance (an invoice number, an amount, a date). */
  facts?: Array<{ label: string; value: string }>;
  action?: { label: string; href: string };
  footer?: string;
};

/** Ensaar's registered address on one line, for footers. */
const companyAddress = () =>
  [siteConfig.address.street, siteConfig.address.city, `${siteConfig.address.region} ${siteConfig.address.postalCode}`, siteConfig.address.country].join(', ');

const BRAND = { navy: '#0c2343', blue: '#008ecf', teal: '#13a694', ink: '#33445c', muted: '#6b7a90', line: '#e3e8ef', page: '#eef2f6' };
const FONT = "'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";
const NOTICE = {
  info: { bg: '#eff8fd', bar: BRAND.blue, ink: '#0b4a6b' },
  warning: { bg: '#fff8eb', bar: '#d97706', ink: '#7a4100' },
  danger: { bg: '#fef2f2', bar: '#b91c1c', ink: '#7f1d1d' },
};

/**
 * One layout for every email Ensaar sends: logo header, brand rule, body, and a
 * footer naming the company. Tables and inline styles only, because that is what
 * Outlook and Gmail render reliably. `paragraphs`, facts and notices are plain
 * text (escaped here), so no caller can inject markup by accident.
 */
export function renderEmail(content: EmailContent): { text: string; html: string } {
  // A sentence ending on a name like "Acme Inc." would otherwise end "Inc.." (an ellipsis is left alone).
  const tidy = (s: string) => s.replace(/(^|[^.])\.\.(?!\.)/g, '$1.');
  const input: EmailContent = {
    ...content,
    heading: tidy(content.heading),
    paragraphs: content.paragraphs.map(tidy),
    notice: content.notice && { ...content.notice, text: tidy(content.notice.text) },
  };
  const site = siteConfig.url.replace(/\/+$/, '');
  const contact = input.contact ?? supportAddress();
  const footer = input.footer ?? `Questions? Reply to this email or write to ${contact}.`;
  const text = [
    input.heading,
    '',
    ...(input.notice ? [input.notice.text, ''] : []),
    ...input.paragraphs.flatMap((p) => [p, '']),
    ...(input.facts?.length ? [...input.facts.map((f) => `${f.label}: ${f.value}`), ''] : []),
    ...(input.action ? [`${input.action.label}: ${input.action.href}`, ''] : []),
    footer,
    '',
    `${siteConfig.legalName}, ${companyAddress()}. CIN ${siteConfig.cin}`,
  ].join('\n');

  const notice = input.notice && NOTICE[input.notice.tone];
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.page}">${escapeHtml((input.notice?.text ?? input.paragraphs[0] ?? '').slice(0, 140))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page}"><tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:8px;overflow:hidden;font-family:${FONT}">
      <tr><td style="padding:22px 36px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="left" valign="middle"><a href="${site}" style="text-decoration:none"><img src="${site}/ensaar-logo.png" width="130" height="36" alt="${escapeHtml(siteConfig.name)}" style="display:block;border:0;outline:none;height:36px;width:130px;color:${BRAND.blue};font:700 20px ${FONT}"></a></td>
          <td align="right" valign="middle" style="font:600 11px ${FONT};letter-spacing:0.09em;text-transform:uppercase;color:${BRAND.muted}">${escapeHtml(input.eyebrow)}</td>
        </tr></table>
      </td></tr>
      <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.teal})">&nbsp;</td></tr>
      <tr><td style="padding:34px 36px 8px">
        <h1 style="margin:0 0 18px;font:700 22px/1.3 ${FONT};color:${BRAND.navy}">${escapeHtml(input.heading)}</h1>
        ${
          notice
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr><td style="background:${notice.bg};border-left:4px solid ${notice.bar};border-radius:4px;padding:12px 16px;font:600 14px/1.5 ${FONT};color:${notice.ink}">${escapeHtml(input.notice!.text)}</td></tr></table>`
            : ''
        }
        ${input.paragraphs.map((p) => `<p style="margin:0 0 14px;font:400 15px/1.65 ${FONT};color:${BRAND.ink};white-space:pre-line">${escapeHtml(p)}</p>`).join('\n        ')}
        ${
          input.facts?.length
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;border:1px solid ${BRAND.line};border-radius:6px">${input.facts
                .map(
                  (f, i) =>
                    `<tr><td style="padding:11px 16px;font:400 13px ${FONT};color:${BRAND.muted};${i ? `border-top:1px solid ${BRAND.line};` : ''}width:42%">${escapeHtml(f.label)}</td><td align="right" style="padding:11px 16px;font:600 14px ${FONT};color:${BRAND.navy};${i ? `border-top:1px solid ${BRAND.line};` : ''}">${escapeHtml(f.value)}</td></tr>`,
                )
                .join('')}</table>`
            : ''
        }
        ${
          input.action
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 22px"><tr><td style="background:${BRAND.navy};border-radius:6px"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;padding:13px 26px;font:600 15px ${FONT};color:#ffffff;text-decoration:none">${escapeHtml(input.action.label)}</a></td></tr></table>`
            : ''
        }
      </td></tr>
      <tr><td style="padding:0 36px 30px">
        <p style="margin:0;padding-top:18px;border-top:1px solid ${BRAND.line};font:400 13px/1.6 ${FONT};color:${BRAND.muted}">${escapeHtml(footer)}</p>
      </td></tr>
      <tr><td style="background:${BRAND.navy};padding:22px 36px">
        <p style="margin:0 0 4px;font:600 13px ${FONT};color:#ffffff">${escapeHtml(siteConfig.legalName)}</p>
        <p style="margin:0 0 4px;font:400 12px/1.6 ${FONT};color:#a9bad1">${escapeHtml(companyAddress())} &nbsp;&middot;&nbsp; CIN ${escapeHtml(siteConfig.cin)}</p>
        <p style="margin:0;font:400 12px/1.6 ${FONT};color:#a9bad1"><a href="mailto:${escapeHtml(contact)}" style="color:#a9bad1;text-decoration:underline">${escapeHtml(contact)}</a> &nbsp;&middot;&nbsp; <a href="${site}" style="color:#a9bad1;text-decoration:underline">${escapeHtml(new URL(site).hostname)}</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { text, html };
}
