import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { displayName, getCompany, sha256 } from './companies';
import {
  CONDUCT_REASONS,
  CONDUCT_STEPS,
  CONDUCT_TITLES,
  NEEDS_REPLY,
  canTerminate,
  conductLetterText,
  isLetterStep,
  type ConductReason,
  type ConductStep,
  type LetterStep,
} from './conduct';
import { conductConcernStaffEmail, conductLetterEmail, conductReplyStaffEmail } from './email';
import { getEmployee, type EorEmployee } from './employees';
import { isIsoDay } from './leave';
import { knownAs, todayInIndia } from './onboarding';
import { ok, refuse, type Outcome } from './outcome';
import { signedPdfAttachment } from './signed-pdf';

/*
 * Corrective action in use. Ensaar opens a case (or the client raises a
 * concern, which opens one), records notes and verbal warnings, and issues
 * letters in its signatory's name; the employee reads, acknowledges and
 * replies in the portal. The client sees only that its concern is open or
 * closed, and the outcome Ensaar chooses to tell it.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

export type ConductEventView = {
  id: string; caseId: string; step: ConductStep; text: string; hash: string | null; issuedBy: string; issuedAt: string;
  responseDue: string | null; acknowledgedAt: string | null; replyText: string | null; repliedAt: string | null;
};
export type ConductCase = {
  id: string; employeeId: string; reason: ConductReason; source: 'client' | 'ensaar'; summary: string; status: 'open' | 'closed';
  clientOutcome: string | null; openedBy: string; openedAt: string; closedBy: string | null; closedAt: string | null; events: ConductEventView[];
};

type CaseRow = {
  id: string; employee_id: string; reason: ConductReason; source: 'client' | 'ensaar'; summary: string; status: 'open' | 'closed';
  client_outcome: string | null; opened_by: string; opened_at: Date; closed_by: string | null; closed_at: Date | null;
};
type EventRow = {
  id: string; case_id: string; step: ConductStep; text: string; hash: string | null; issued_by: string; issued_at: Date;
  response_due: Date | null; acknowledged_at: Date | null; reply_text: string | null; replied_at: Date | null;
};
const toEvent = (r: EventRow): ConductEventView => ({
  id: r.id, caseId: r.case_id, step: r.step, text: r.text, hash: r.hash, issuedBy: r.issued_by, issuedAt: r.issued_at.toISOString(),
  responseDue: r.response_due?.toISOString().slice(0, 10) ?? null, acknowledgedAt: r.acknowledged_at?.toISOString() ?? null,
  replyText: r.reply_text, repliedAt: r.replied_at?.toISOString() ?? null,
});

export async function listCases(employeeId: string, sql: Executor = db()): Promise<ConductCase[]> {
  if (!hasDatabase()) return [];
  const cases = await sql<CaseRow[]>`SELECT * FROM ensaar_conduct_cases WHERE employee_id = ${employeeId} ORDER BY opened_at DESC`;
  if (!cases.length) return [];
  const events = await sql<EventRow[]>`SELECT * FROM ensaar_conduct_events WHERE case_id IN ${sql(cases.map((c) => c.id))} ORDER BY issued_at`;
  return cases.map((c) => ({
    id: c.id, employeeId: c.employee_id, reason: c.reason, source: c.source, summary: c.summary, status: c.status, clientOutcome: c.client_outcome,
    openedBy: c.opened_by, openedAt: c.opened_at.toISOString(), closedBy: c.closed_by, closedAt: c.closed_at?.toISOString() ?? null,
    events: events.filter((e) => e.case_id === c.id).map(toEvent),
  }));
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Ensaar opens a case. */
export async function openCase(employeeId: string, input: { reason: unknown; summary: unknown; by: string }): Promise<Outcome<{ id: string }>> {
  if (typeof input.reason !== 'string' || !(input.reason in CONDUCT_REASONS)) return refuse(400, 'Choose what the case is about.');
  const summary = clean(input.summary, 2000);
  if (summary.length < 10) return refuse(400, 'Describe the matter in a sentence or two.');
  const id = randomUUID();
  await requireDatabase()`
    INSERT INTO ensaar_conduct_cases (id, employee_id, reason, source, summary, opened_by) VALUES (${id}, ${employeeId}, ${input.reason}, 'ensaar', ${summary}, ${input.by})
  `;
  return ok({ id });
}

/** The client raises a concern about one of its own employees (master agreement clause 3: in writing, with the facts). */
export async function raiseConcern(companyId: string, input: { employeeId: unknown; reason: unknown; details: unknown; by: string }): Promise<Outcome<{ id: string }>> {
  const employee = await getEmployee(String(input.employeeId ?? ''), companyId);
  if (!employee || ['draft', 'cancelled', 'exited'].includes(employee.status)) return refuse(404, 'Choose one of your employees.');
  if (typeof input.reason !== 'string' || !(input.reason in CONDUCT_REASONS)) return refuse(400, 'Choose what the concern is about.');
  const details = clean(input.details, 4000);
  if (details.length < 20) return refuse(400, 'Describe what happened: when, what, and any evidence. Ensaar needs the facts to act fairly.');
  const company = await getCompany(companyId);
  return requireDatabase().begin(async (tx) => {
    const id = randomUUID();
    await tx`
      INSERT INTO ensaar_conduct_cases (id, employee_id, reason, source, summary, opened_by)
      VALUES (${id}, ${employee.id}, ${input.reason as string}, 'client', ${details.slice(0, 300)}, ${input.by})
    `;
    await tx`
      INSERT INTO ensaar_conduct_events (id, case_id, step, text, issued_by) VALUES (${randomUUID()}, ${id}, 'client_report', ${details}, ${input.by})
    `;
    await enqueue(tx, {
      kind: 'basecamp.conduct.concern',
      to: await staffRecipients(tx),
      relatedId: employee.id,
      dedupeKey: `basecamp.conduct.concern:${id}`,
      ...conductConcernStaffEmail({ employeeName: employee.employeeName, companyName: company ? displayName(company) : 'The client', employeeId: employee.id }),
    });
    return ok({ id });
  });
}

/** A note or a verbal warning on file: Ensaar's record, not sent to the employee. */
export async function addNote(caseId: string, input: { step: unknown; text: unknown; by: string }): Promise<Outcome<null>> {
  if (input.step !== 'note' && input.step !== 'verbal_warning') return refuse(400, 'Choose a note or a verbal warning.');
  const text = clean(input.text, 4000);
  if (text.length < 5) return refuse(400, 'Write what was said or decided.');
  const rows = await requireDatabase()`
    INSERT INTO ensaar_conduct_events (id, case_id, step, text, issued_by)
    SELECT ${randomUUID()}, id, ${input.step}, ${text}, ${input.by} FROM ensaar_conduct_cases WHERE id = ${caseId} AND status = 'open'
    RETURNING id
  `;
  return rows.length ? ok(null) : refuse(409, 'This case is closed.');
}

/** Add n working days (Monday to Friday) to a day. */
function addWorkingDays(day: string, n: number): string {
  let t = Date.parse(`${day}T00:00:00Z`);
  let left = n;
  while (left > 0) {
    t += 86_400_000;
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) left -= 1;
  }
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Ensaar's signatory issues a letter: frozen, fingerprinted, emailed from HR as
 * a PDF and shown in the employee's portal. A termination letter is refused
 * until the employee has been warned or had the chance to answer.
 */
export async function issueLetter(
  caseId: string,
  input: { step: unknown; details: unknown; expectation?: unknown; dueDate?: unknown; lastDay?: unknown; basis?: unknown; signatory: string },
): Promise<Outcome<{ id: string }>> {
  if (!isLetterStep(input.step)) return refuse(400, 'Choose the letter.');
  const step: LetterStep = input.step;
  const details = clean(input.details, 4000);
  if (details.length < 10) return refuse(400, 'Write what happened, in the words the employee will read.');
  return requireDatabase().begin(async (tx) => {
    const [c] = await tx<CaseRow[]>`SELECT * FROM ensaar_conduct_cases WHERE id = ${caseId} FOR UPDATE`;
    if (!c) return refuse(404, 'No such case.');
    if (c.status === 'closed') return refuse(409, 'This case is closed. Open a new one.');
    const employee = await getEmployee(c.employee_id);
    if (!employee?.employeeEmail) return refuse(409, 'The employee has no email address.');
    const today = todayInIndia();
    let dueDate: string | null = null;
    if (NEEDS_REPLY.includes(step)) {
      dueDate = isIsoDay(input.dueDate) ? input.dueDate : addWorkingDays(today, 3);
      if (dueDate <= today) return refuse(400, 'Give the employee until a later day to reply.');
    } else if (isIsoDay(input.dueDate)) {
      dueDate = input.dueDate;
    }
    if (step === 'termination') {
      const events = (await tx<EventRow[]>`SELECT * FROM ensaar_conduct_events WHERE case_id IN (SELECT id FROM ensaar_conduct_cases WHERE employee_id = ${c.employee_id})`).map(toEvent);
      const allowed = canTerminate(events.map((e) => ({ step: e.step, issuedAt: e.issuedAt, responseDue: e.responseDue, repliedAt: e.repliedAt })), today);
      if (!allowed.ok) return refuse(409, allowed.reason);
      if (input.basis !== 'notice' && input.basis !== 'pay_in_lieu' && input.basis !== 'serious_misconduct') return refuse(400, 'Choose notice, pay in place of notice, or serious misconduct.');
    }
    const company = await getCompany(employee.companyId);
    const text = conductLetterText({
      step,
      employeeName: employee.employeeName,
      employeeEmail: employee.employeeEmail,
      jobTitle: employee.jobTitle,
      companyName: company ? displayName(company) : 'the Client',
      issuedOn: today,
      details,
      expectation: clean(input.expectation, 2000) || null,
      dueDate,
      lastDay: isIsoDay(input.lastDay) ? input.lastDay : null,
      basis: (input.basis as 'notice' | 'pay_in_lieu' | 'serious_misconduct' | undefined) ?? null,
      signatory: input.signatory,
    });
    const hash = sha256(text);
    const id = randomUUID();
    await tx`
      INSERT INTO ensaar_conduct_events (id, case_id, step, text, hash, issued_by, response_due)
      VALUES (${id}, ${caseId}, ${step}, ${text}, ${hash}, ${input.signatory}, ${dueDate})
    `;
    await enqueue(tx, {
      kind: 'team.conduct.letter',
      to: [employee.employeeEmail],
      relatedId: employee.id,
      dedupeKey: `team.conduct.letter:${id}`,
      attachments: [await signedPdfAttachment(`Ensaar-${CONDUCT_TITLES[step].replace(/[^\w]+/g, '-')}.pdf`, [`${text}\n\nDocument fingerprint (SHA-256): ${hash}`], CONDUCT_TITLES[step])],
      ...conductLetterEmail({ name: knownAs(employee), title: CONDUCT_TITLES[step], replyBy: NEEDS_REPLY.includes(step) ? dueDate : null }),
    });
    return ok({ id });
  });
}

/** Ensaar closes a case, with what (if anything) the client is told. */
export async function closeCase(caseId: string, input: { clientOutcome: unknown; note: unknown; by: string }): Promise<Outcome<null>> {
  const outcome = clean(input.clientOutcome, 500) || null;
  const note = clean(input.note, 2000) || 'Closed.';
  return requireDatabase().begin(async (tx) => {
    const rows = await tx`
      UPDATE ensaar_conduct_cases SET status = 'closed', client_outcome = ${outcome}, closed_by = ${input.by}, closed_at = NOW()
      WHERE id = ${caseId} AND status = 'open' RETURNING id
    `;
    if (!rows.length) return refuse(409, 'This case is already closed.');
    await tx`INSERT INTO ensaar_conduct_events (id, case_id, step, text, issued_by) VALUES (${randomUUID()}, ${caseId}, 'closed', ${note}, ${input.by})`;
    return ok(null);
  });
}

export type EmployeeLetter = { id: string; step: LetterStep; title: string; text: string; hash: string; issuedAt: string; responseDue: string | null; acknowledgedAt: string | null; replyText: string | null; repliedAt: string | null };

/** The letters an employee has been sent: never notes, client reports or who issued them internally. */
export async function employeeLetters(employeeId: string): Promise<EmployeeLetter[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<EventRow[]>`
    SELECT ev.* FROM ensaar_conduct_events ev JOIN ensaar_conduct_cases c ON c.id = ev.case_id
    WHERE c.employee_id = ${employeeId} AND ev.hash IS NOT NULL ORDER BY ev.issued_at DESC
  `;
  return rows
    .map(toEvent)
    .filter((e): e is ConductEventView & { step: LetterStep; hash: string } => isLetterStep(e.step) && e.hash !== null)
    .map((e) => ({ id: e.id, step: e.step, title: CONDUCT_TITLES[e.step], text: e.text, hash: e.hash, issuedAt: e.issuedAt, responseDue: e.responseDue, acknowledgedAt: e.acknowledgedAt, replyText: e.replyText, repliedAt: e.repliedAt }));
}

/** The employee acknowledges a letter, and may reply once (their account, kept with the letter). */
export async function respondToLetter(employee: EorEmployee, letterId: string, input: { reply?: unknown }): Promise<Outcome<null>> {
  const reply = clean(input.reply, 8000);
  return requireDatabase().begin(async (tx) => {
    const [row] = await tx<(EventRow & { employee_id: string })[]>`
      SELECT ev.*, c.employee_id FROM ensaar_conduct_events ev JOIN ensaar_conduct_cases c ON c.id = ev.case_id
      WHERE ev.id = ${letterId} AND c.employee_id = ${employee.id} AND ev.hash IS NOT NULL FOR UPDATE OF ev
    `;
    if (!row) return refuse(404, 'No such letter.');
    if (reply && row.replied_at) return refuse(409, `You have already replied. To add anything, write to HR.`);
    await tx`
      UPDATE ensaar_conduct_events SET acknowledged_at = COALESCE(acknowledged_at, NOW()),
        reply_text = COALESCE(reply_text, ${reply || null}), replied_at = CASE WHEN ${Boolean(reply)} AND replied_at IS NULL THEN NOW() ELSE replied_at END
      WHERE id = ${letterId}
    `;
    if (reply) {
      await enqueue(tx, {
        kind: 'basecamp.conduct.reply',
        to: await staffRecipients(tx),
        relatedId: employee.id,
        dedupeKey: `basecamp.conduct.reply:${letterId}`,
        ...conductReplyStaffEmail({ employeeName: employee.employeeName, title: isLetterStep(row.step) ? CONDUCT_TITLES[row.step] : CONDUCT_STEPS[row.step].label, employeeId: employee.id }),
      });
    }
    return ok(null);
  });
}

/** What a client sees of the concerns it raised: status and the outcome Ensaar shares. */
export async function clientConcerns(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await db()<(CaseRow & { employee_name: string; business_name: string | null })[]>`
    SELECT c.*, e.employee_name, e.business_name FROM ensaar_conduct_cases c JOIN ensaar_eor_employees e ON e.id = c.employee_id
    WHERE e.company_id = ${companyId} AND c.source = 'client' ORDER BY c.opened_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    employeeName: knownAs({ employeeName: r.employee_name, businessName: r.business_name }),
    reason: r.reason,
    raisedAt: r.opened_at.toISOString(),
    status: r.status,
    outcome: r.status === 'closed' ? r.client_outcome : null,
  }));
}
