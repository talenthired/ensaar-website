/**
 * What a client or an employee still owes Ensaar, and when they are reminded.
 * Pure and shared (no 'server-only'): the reminder job, Basecamp and both
 * portals read the same lists, so an email never asks for something the
 * screens say is done.
 *
 * Nothing here blocks onboarding. A client can sign, and an employee can start,
 * with items outstanding; they are reminded twice a week until each arrives.
 */

import type { CompanyDetails, DocumentReview } from './onboarding';

/** Reminders go out on these weekdays (0 = Sunday): Monday and Thursday. */
export const REMINDER_WEEKDAYS = [1, 4] as const;
/** Clients are US companies: their working morning. */
export const CLIENT_REMINDER = { timeZone: 'America/New_York', hour: 9 } as const;
/** Employees are in India. */
export const EMPLOYEE_REMINDER = { timeZone: 'Asia/Kolkata', hour: 10 } as const;

type Slot = { timeZone: string; hour: number };

/** The date, weekday and hour in a time zone. */
export function zonedNow(now: Date, timeZone: string): { date: string; weekday: number; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday!);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday, hour: Number(parts.hour) };
}

/** The local date a scheduled reminder is due for, or null if none is due right now. */
export function reminderSlot(now: Date, slot: Slot): string | null {
  const local = zonedNow(now, slot.timeZone);
  if (!(REMINDER_WEEKDAYS as readonly number[]).includes(local.weekday) || local.hour < slot.hour) return null;
  return local.date;
}

/** One thing still needed: a short label for lists, and the sentence that explains it. */
export type Outstanding = { key: string; label: string; detail: string };
export type OutstandingList = { received: string[]; needed: Outstanding[] };

export const OWNERSHIP_THRESHOLD_PERCENT = 25;

/** What a client company still owes: details that can follow, the formation document, the ownership declaration. */
export function companyOutstanding(input: {
  details: CompanyDetails | null;
  documents: Array<{ kind: string; reviewStatus: DocumentReview }>;
  ownershipDeclared: boolean;
}): OutstandingList {
  const { details } = input;
  if (!details) return { received: [], needed: [] };
  const llc = details.entityType === 'llc';
  const formationName = llc ? 'Certificate of Organization' : 'Certificate of incorporation';
  const formationUsable = input.documents.some((d) => d.kind === 'formation' && d.reviewStatus !== 'rejected');
  const needed: Outstanding[] = [];
  if (!details.signatoryTitle) needed.push({ key: 'signatory_title', label: 'Your title', detail: 'Your title, as it should appear on the agreement (for example, CEO).' });
  if (!details.billingEmail) needed.push({ key: 'billing_email', label: 'Billing email', detail: 'A billing email address for invoices.' });
  if (!details.incorporationState) needed.push({ key: 'formation_state', label: 'State of formation', detail: `The state where the ${llc ? 'LLC' : 'company'} was formed.` });
  if (!formationUsable) {
    needed.push({ key: 'formation', label: formationName, detail: `${formationName}: the document the state issued when the ${llc ? 'LLC' : 'company'} was formed.` });
  }
  if (!input.ownershipDeclared) {
    needed.push({
      key: 'ownership',
      label: 'Ownership declaration',
      detail: `Beneficial ownership declaration: the name, date of birth, country and ownership share of each person who owns or controls ${OWNERSHIP_THRESHOLD_PERCENT}% or more of the ${llc ? 'LLC' : 'company'}. You can fill it in and sign it in the portal in about two minutes.`,
    });
  }
  const received = [
    'Company name and address',
    `EIN ${details.ein}`,
    'Signatory',
    ...(details.signatoryTitle ? ['Your title'] : []),
    ...(details.billingEmail ? ['Billing email'] : []),
    ...(details.incorporationState ? ['State of formation'] : []),
    ...(formationUsable ? [formationName] : []),
    ...(input.ownershipDeclared ? ['Ownership declaration'] : []),
  ];
  return { received, needed };
}

/** What an employee still owes before they can be paid: the salary account, and a relieving letter if they had an employer. */
export function employeeOutstanding(input: {
  legalName: string;
  hasBankDetails: boolean;
  hasBankProof: boolean;
  hasRelievingLetter: boolean;
  noPreviousEmployer: boolean;
  identityVerified: boolean;
}): OutstandingList {
  const needed: Outstanding[] = [];
  if (!input.hasBankDetails) {
    needed.push({
      key: 'bank',
      label: 'Bank account',
      detail: `Your bank account for salary: account holder name, account number and IFSC, with a cancelled cheque or the first page of your passbook. The account should be in your legal name, ${input.legalName}.`,
    });
  } else if (!input.hasBankProof) {
    needed.push({ key: 'bank_proof', label: 'Proof of bank account', detail: 'A cancelled cheque or the first page of your passbook, for the account you gave us.' });
  }
  if (!input.hasRelievingLetter && !input.noPreviousEmployer) {
    needed.push({ key: 'relieving_letter', label: 'Relieving letter', detail: 'A relieving letter from your last employer, if you had one. If this is your first job, say so in the portal.' });
  }
  const received = [
    ...(input.identityVerified ? ['PAN', 'Aadhaar'] : []),
    ...(input.hasBankDetails && input.hasBankProof ? ['Bank account'] : []),
    ...(input.hasRelievingLetter ? ['Relieving letter'] : []),
  ];
  return { received, needed };
}

/** "two items", "one item": for subjects and headings. */
export function itemCount(n: number): string {
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return `${words[n] ?? n} item${n === 1 ? '' : 's'}`;
}
