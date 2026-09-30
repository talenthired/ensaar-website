import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { deliverDue, enqueue, staffRecipients } from '@/lib/notify/outbox';
import {
  OVERDUE_NOTICE_LIMIT_DAYS,
  REMIND_DAYS_BEFORE,
  REMINDER_HOUR,
  addDays,
  billingNow,
  daysOverdue,
  lateInterestUsd,
  reminderStage,
  type Invoice,
  type InvoiceInput,
  type InvoiceStatus,
  type ReminderStage,
} from './billing';
import { displayName, lockCompany, type EorCompany } from './companies';
import { invoiceIssuedEmail, invoiceOverdueStaffEmail, invoicePaidEmail, invoiceReminderEmail } from './email';
import { ok, refuse, type Outcome } from './outcome';
import { companyRecipients } from './portal-auth';

/*
 * Invoices recorded against a client so that payment is reminded and chased.
 * Ensaar raises the invoice itself in accounting and sends it; this records
 * what is owed and by when, emails the customer before and after the due date,
 * and stops the moment staff mark it paid.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

type Row = {
  id: string;
  company_id: string;
  number: string;
  period: string;
  amount_usd: string;
  issued_on: string;
  due_on: string;
  status: InvoiceStatus;
  paid_on: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: Date;
};

// Dates are read as text: a DATE has no time zone, and must not pick one up on the way through a JS Date.
const select = (sql: Executor) => sql`
  id, company_id, number, period, amount_usd::text, issued_on::text, due_on::text, status, paid_on::text, summary, created_by, created_at
`;

const toInvoice = (r: Row): Invoice => ({
  id: r.id,
  companyId: r.company_id,
  number: r.number,
  period: r.period,
  amountUsd: Number(r.amount_usd),
  issuedOn: r.issued_on,
  dueOn: r.due_on,
  status: r.status,
  paidOn: r.paid_on,
  summary: r.summary,
  createdBy: r.created_by,
  createdAt: r.created_at.toISOString(),
});

export async function listInvoices(companyId: string): Promise<Invoice[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql<Row[]>`SELECT ${select(sql)} FROM ensaar_eor_invoices WHERE company_id = ${companyId} ORDER BY issued_on DESC, created_at DESC LIMIT 200`;
  return rows.map(toInvoice);
}

/** What staff and the customer both see beside an invoice: how late it is and the interest that has accrued. */
export function invoiceState(invoice: Invoice, today = billingNow().today) {
  const late = daysOverdue(invoice, today);
  return { ...invoice, daysOverdue: late, interestUsd: lateInterestUsd(invoice.amountUsd, late) };
}

export type InvoiceState = ReturnType<typeof invoiceState>;

/** What a customer sees: no creator identity. */
export function invoiceView(invoice: Invoice, today = billingNow().today) {
  const { createdBy: _createdBy, companyId: _companyId, ...rest } = invoiceState(invoice, today);
  return rest;
}

export type InvoiceView = ReturnType<typeof invoiceView>;

/** Everyone at the customer who should hear about money: the billing address and the portal's people. */
async function billingRecipients(tx: Executor, company: EorCompany): Promise<string[]> {
  return [...(company.company?.billingEmail ? [company.company.billingEmail] : []), ...(await companyRecipients(tx, company.id))];
}

async function lockInvoice(tx: postgres.TransactionSql, companyId: string, invoiceId: string): Promise<Invoice | null> {
  const rows = await tx<Row[]>`SELECT ${select(tx)} FROM ensaar_eor_invoices WHERE id = ${invoiceId} AND company_id = ${companyId} FOR UPDATE`;
  return rows[0] ? toInvoice(rows[0]) : null;
}

/** Record an invoice and tell the customer it has been issued. */
export async function createInvoice(companyId: string, input: InvoiceInput, actor: string): Promise<Outcome<Invoice>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status !== 'active') return refuse(409, 'Invoices are for active clients: countersign the agreement first.');
    const [clash] = await tx`SELECT 1 FROM ensaar_eor_invoices WHERE lower(number) = ${input.number.toLowerCase()}`;
    if (clash) return refuse(409, `Invoice ${input.number} is already recorded.`);
    const rows = await tx<Row[]>`
      INSERT INTO ensaar_eor_invoices (id, company_id, number, period, amount_usd, issued_on, due_on, summary, created_by)
      VALUES (${randomUUID()}, ${companyId}, ${input.number}, ${input.period}, ${input.amountUsd}, ${input.issuedOn}, ${input.dueOn}, ${input.summary}, ${actor})
      RETURNING ${select(tx)}
    `;
    const invoice = toInvoice(rows[0]!);
    await enqueue(tx, {
      kind: 'invoice.issued',
      to: await billingRecipients(tx, company),
      relatedId: companyId,
      dedupeKey: `invoice:${invoice.id}:issued`,
      ...invoiceIssuedEmail({ companyName: displayName(company), invoice }),
    });
    return ok(invoice);
  });
}

/** Payment has arrived: reminders stop and the customer is thanked. */
export async function markInvoicePaid(companyId: string, invoiceId: string, paidOn: string): Promise<Outcome<Invoice>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    const invoice = company && (await lockInvoice(tx, companyId, invoiceId));
    if (!company || !invoice) return refuse(404, 'No such invoice.');
    if (invoice.status !== 'open') return refuse(409, invoice.status === 'paid' ? 'Already marked paid.' : 'This invoice is void.');
    if (paidOn < invoice.issuedOn) return refuse(400, 'The payment date cannot be before the invoice date.');
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_invoices SET status = 'paid', paid_on = ${paidOn}, updated_at = NOW() WHERE id = ${invoiceId} RETURNING ${select(tx)}
    `;
    const paid = toInvoice(rows[0]!);
    await enqueue(tx, {
      kind: 'invoice.paid',
      to: await billingRecipients(tx, company),
      relatedId: companyId,
      dedupeKey: `invoice:${invoiceId}:paid:${paidOn}`,
      ...invoicePaidEmail({ companyName: displayName(company), invoice: paid, paidOn }),
    });
    return ok(paid);
  });
}

/** Void a wrongly recorded invoice, or reopen one marked paid or void by mistake. Neither emails the customer. */
export async function setInvoiceStatus(companyId: string, invoiceId: string, to: 'void' | 'open'): Promise<Outcome<Invoice>> {
  return requireDatabase().begin(async (tx) => {
    const invoice = await lockInvoice(tx, companyId, invoiceId);
    if (!invoice) return refuse(404, 'No such invoice.');
    if (invoice.status === to) return refuse(409, to === 'void' ? 'Already void.' : 'Already open.');
    if (to === 'void' && invoice.status === 'paid') return refuse(409, 'A paid invoice cannot be voided. Reopen it first if it was marked paid by mistake.');
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_invoices SET status = ${to}, paid_on = NULL, updated_at = NOW() WHERE id = ${invoiceId} RETURNING ${select(tx)}
    `;
    return ok(toInvoice(rows[0]!));
  });
}

async function enqueueReminder(tx: Executor, company: EorCompany, invoice: Invoice, stage: ReminderStage, today: string, dedupeKey: string) {
  await enqueue(tx, {
    kind: `invoice.${stage.kind}`,
    to: await billingRecipients(tx, company),
    relatedId: company.id,
    dedupeKey,
    ...invoiceReminderEmail({ companyName: displayName(company), invoice, stage, today }),
  });
}

/** Staff "Send reminder now": the reminder that fits the invoice today, whatever has already been sent. */
export async function remindNow(companyId: string, invoiceId: string, now = new Date()): Promise<Outcome<{ kind: ReminderStage['kind']; to: string[] }>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    const invoice = company && (await lockInvoice(tx, companyId, invoiceId));
    if (!company || !invoice) return refuse(404, 'No such invoice.');
    if (invoice.status !== 'open') return refuse(409, 'Only an open invoice can be reminded.');
    const { today } = billingNow(now);
    const late = daysOverdue(invoice, today);
    const stage: ReminderStage = late > 0 ? { key: 'manual', kind: 'overdue', daysLate: late } : { key: 'manual', kind: invoice.dueOn === today ? 'due' : 'upcoming', daysLate: 0 };
    await enqueueReminder(tx, company, invoice, stage, today, `invoice:${invoiceId}:manual:${now.toISOString()}`);
    return ok({ kind: stage.kind, to: await billingRecipients(tx, company) });
  });
}

/**
 * Queue every reminder that is owed right now. Runs on a timer (instrumentation.ts)
 * and is safe to run as often as wanted, or from several processes: each stage of
 * each invoice has one dedupe key, so it is sent once.
 */
export async function runInvoiceReminders(now = new Date()): Promise<{ queued: number }> {
  if (!hasDatabase()) return { queued: 0 };
  const { today, hour } = billingNow(now);
  // Reminders land in the customer's working day, not at midnight.
  if (hour < REMINDER_HOUR) return { queued: 0 };
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM ensaar_eor_invoices i
    WHERE i.status = 'open'
      AND i.due_on BETWEEN ${addDays(today, -OVERDUE_NOTICE_LIMIT_DAYS)}::date AND ${addDays(today, REMIND_DAYS_BEFORE)}::date
      AND EXISTS (SELECT 1 FROM ensaar_eor_companies c WHERE c.id = i.company_id AND c.status <> 'cancelled')
    ORDER BY i.due_on LIMIT 500
  `;
  const owed = rows.map(toInvoice).flatMap((invoice) => {
    const stage = reminderStage(invoice, today);
    return stage ? [{ invoice, stage, key: `invoice:${invoice.id}:${stage.key}` }] : [];
  });
  if (owed.length === 0) return { queued: 0 };
  const sent = new Set(
    (await sql<{ dedupe_key: string }[]>`SELECT dedupe_key FROM ensaar_outbox WHERE dedupe_key = ANY(${owed.map((o) => o.key)})`).map((r) => r.dedupe_key),
  );

  let queued = 0;
  for (const { invoice, stage, key } of owed) {
    if (sent.has(key)) continue;
    await sql.begin(async (tx) => {
      const company = await lockCompany(tx, invoice.companyId);
      const current = company && (await lockInvoice(tx, invoice.companyId, invoice.id));
      // Paid or voided since the list was read: nothing to send.
      if (!company || !current || current.status !== 'open') return;
      await enqueueReminder(tx, company, current, stage, today, key);
      if (stage.kind === 'overdue') {
        await enqueue(tx, {
          kind: 'invoice.overdue.staff',
          to: await staffRecipients(tx),
          relatedId: company.id,
          dedupeKey: `invoice:${invoice.id}:staff-overdue`,
          ...invoiceOverdueStaffEmail({ companyName: displayName(company), companyId: company.id, invoice: current }),
        });
      }
      queued++;
    });
  }
  return { queued };
}

/** One pass of the background job: queue reminders, then deliver whatever is due (which also retries failures). */
export async function billingTick(): Promise<void> {
  await runInvoiceReminders();
  await deliverDue(25);
}
