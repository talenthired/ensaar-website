/**
 * EOR invoicing: the terms the agreement states, and the rules the reminder
 * emails follow. Pure and shared (no 'server-only'): the agreement text, the
 * Basecamp and portal screens and the reminder job all read the same numbers,
 * so an email can never promise something the agreement does not say.
 */

/** Invoices are dated the 15th of each month. */
export const INVOICE_DAY = 15;
/** Payable within this many days of the invoice date. */
export const PAYMENT_DAYS = 7;
/** Interest on an overdue amount, per month, calculated daily. */
export const LATE_INTEREST_PERCENT_PER_MONTH = 1.5;

/** A reminder goes out this many days before the due date. */
export const REMIND_DAYS_BEFORE = 3;
/** Days past due on which an overdue notice goes out; after the last, weekly. */
export const OVERDUE_NOTICE_DAYS = [1, 3, 7] as const;
/** Reminders for one invoice stop after this long; by then it is a conversation, not an email. */
export const OVERDUE_NOTICE_LIMIT_DAYS = 90;

/**
 * Customers are US companies, so "today" for a due date is the US Eastern date,
 * and reminders are sent once the US working day has started.
 */
export const BILLING_TIME_ZONE = 'America/New_York';
export const REMINDER_HOUR = 9;

export const INVOICE_STATUSES = ['open', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Invoice = {
  id: string;
  companyId: string;
  /** Ensaar's invoice number, as printed on the invoice. */
  number: string;
  /** The month it covers, YYYY-MM. */
  period: string;
  amountUsd: number;
  /** YYYY-MM-DD. */
  issuedOn: string;
  dueOn: string;
  status: InvoiceStatus;
  paidOn: string | null;
  /** One line the customer sees: what the invoice is for. */
  summary: string | null;
  createdBy: string | null;
  createdAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const dayToMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function addDays(day: string, days: number): string {
  return new Date(dayToMs(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToMs(to) - dayToMs(from)) / DAY_MS);
}

/** The billing date and hour right now, in the customers' time zone. */
export function billingNow(now = new Date()): { today: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: BILLING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { today: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** The invoice date for the month `today` falls in, and its due date. */
export function defaultInvoiceDates(today: string): { issuedOn: string; dueOn: string; period: string } {
  const issuedOn = `${today.slice(0, 7)}-${String(INVOICE_DAY).padStart(2, '0')}`;
  return { issuedOn, dueOn: addDays(issuedOn, PAYMENT_DAYS), period: today.slice(0, 7) };
}

/** "October 2026" from "2026-10". */
export function formatPeriod(period: string): string {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Invoice amounts carry cents, unlike the whole-dollar monthly fee. */
export function formatUsdExact(value: number): string {
  return `US$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

/** How late an open invoice is; 0 when it is not overdue. */
export function daysOverdue(invoice: Pick<Invoice, 'dueOn' | 'status'>, today: string): number {
  return invoice.status === 'open' ? Math.max(0, daysBetween(invoice.dueOn, today)) : 0;
}

/**
 * Interest accrued so far on an overdue amount: simple interest at the monthly
 * rate, by the day (a month is 30 days), to the cent.
 */
export function lateInterestUsd(amountUsd: number, daysLate: number): number {
  if (daysLate <= 0) return 0;
  return Math.round(amountUsd * (LATE_INTEREST_PERCENT_PER_MONTH / 100) * (daysLate / 30) * 100) / 100;
}

export type ReminderStage = { key: string; kind: 'upcoming' | 'due' | 'overdue'; daysLate: number };

/**
 * The reminder an open invoice is owed today, if any. Each stage has a stable
 * key and is sent once, so a job that runs every few minutes (or misses a day)
 * still sends each notice exactly once, and only the latest one reached.
 */
export function reminderStage(invoice: Pick<Invoice, 'dueOn' | 'issuedOn' | 'status'>, today: string): ReminderStage | null {
  if (invoice.status !== 'open') return null;
  const days = daysBetween(invoice.dueOn, today);
  if (days < -REMIND_DAYS_BEFORE || days > OVERDUE_NOTICE_LIMIT_DAYS) return null;
  if (days < 0) {
    // An invoice issued this close to its due date has just been announced; no second email the same week.
    return daysBetween(invoice.issuedOn, today) < 2 ? null : { key: 'upcoming', kind: 'upcoming', daysLate: 0 };
  }
  if (days === 0) return { key: 'due', kind: 'due', daysLate: 0 };
  const last = OVERDUE_NOTICE_DAYS[OVERDUE_NOTICE_DAYS.length - 1]!;
  const reached = days >= last ? last + Math.floor((days - last) / 7) * 7 : [...OVERDUE_NOTICE_DAYS].reverse().find((d) => d <= days)!;
  return { key: `overdue-${reached}`, kind: 'overdue', daysLate: days };
}

// --- Validation -----------------------------------------------------------------

export type InvoiceInput = { number: string; period: string; amountUsd: number; issuedOn: string; dueOn: string; summary: string | null };
type Errors = Record<string, string>;

/** What Ensaar enters to record an invoice it has raised. */
export function validateInvoice(input: unknown): { ok: true; value: InvoiceInput } | { ok: false; errors: Errors } {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const text = (key: string, max: number) => (typeof body[key] === 'string' ? (body[key] as string).trim().replace(/\s+/g, ' ').slice(0, max) : '');
  const errors: Errors = {};

  const number = text('number', 40);
  const period = text('period', 7);
  const issuedOn = text('issuedOn', 10);
  const dueOn = text('dueOn', 10);
  const summary = text('summary', 300);
  const amountUsd = Number(String(body.amountUsd ?? '').replace(/[$,\s]/g, ''));

  if (number.length < 2) errors.number = 'Enter the invoice number, as printed on the invoice.';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) errors.period = 'Choose the month the invoice covers.';
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 10_000_000 || Math.abs(amountUsd * 100 - Math.round(amountUsd * 100)) > 1e-6) {
    errors.amountUsd = 'Enter the invoice total in US dollars, for example 4250.00.';
  }
  if (!isDay(issuedOn)) errors.issuedOn = 'Enter the invoice date.';
  if (!isDay(dueOn)) errors.dueOn = 'Enter the due date.';
  else if (isDay(issuedOn) && dueOn < issuedOn) errors.dueOn = 'The due date cannot be before the invoice date.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { number, period, amountUsd, issuedOn, dueOn, summary: summary || null } };
}
