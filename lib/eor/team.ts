import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { displayName, getCompany, sha256 } from './companies';
import { employeeDocumentSignedEmail, employeeDocumentSignedStaffEmail, holidaysDecidedEmail, holidaysSubmittedEmail } from './email';
import { getEmployee, type EorEmployee } from './employees';
import { buildEmploymentAgreement, buildOfferLetter, employmentDocToText, type EmploymentDocument, type SignatureEvidence } from './employment-docs';
import { checkHolidayChoice, holidayCatalogue, holidayId, type Holiday, type HolidayCountry, type HolidayPlanStatus } from './holidays';
import { formatDay, knownAs, signatureMatches, todayInIndia } from './onboarding';
import { ok, refuse, type Outcome } from './outcome';
import { companyRecipients } from './portal-auth';
import { EMPTY_DECLARATIONS, TAX_RULES, compareRegimes, readDeclarations, type Regime, type TaxDeclarations } from './tax';
import { inviteEmployee } from './team-auth';

/*
 * What an employee does for themselves in the employee portal, and what staff
 * and the client see of it:
 *   - documents: offer letter and employment agreement, issued by Ensaar with
 *     their text frozen and fingerprinted, signed by the employee as themselves;
 *   - tax: the regime (new by default) and old-regime declarations;
 *   - holidays: one calendar per client per year, proposed by any of its
 *     employees, approved by the client (or decided by Ensaar), and then the
 *     same for every employee of that client.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

// --- Documents ----------------------------------------------------------------------------

export type DocumentKind = 'offer' | 'agreement';
export const DOCUMENT_KINDS: Record<DocumentKind, string> = { offer: 'Offer letter', agreement: 'Employment agreement' };
export const isDocumentKind = (value: unknown): value is DocumentKind => value === 'offer' || value === 'agreement';

export type EmployeeDocument = {
  id: string;
  employeeId: string;
  kind: DocumentKind;
  status: 'sent' | 'signed' | 'void';
  hash: string;
  issuedBy: string | null;
  issuedAt: string;
  signedName: string | null;
  signedEmail: string | null;
  signedAt: string | null;
  signedIp: string | null;
  voidReason: string | null;
};

type DocRow = {
  id: string; employee_id: string; kind: DocumentKind; status: EmployeeDocument['status']; hash: string; issued_by: string | null; issued_at: Date;
  signed_name: string | null; signed_email: string | null; signed_at: Date | null; signed_ip: string | null; void_reason: string | null;
  document?: EmploymentDocument; text?: string;
};
const DOC_COLUMNS = ['id', 'employee_id', 'kind', 'status', 'hash', 'issued_by', 'issued_at', 'signed_name', 'signed_email', 'signed_at', 'signed_ip', 'void_reason'];
const toDoc = (r: DocRow): EmployeeDocument => ({
  id: r.id, employeeId: r.employee_id, kind: r.kind, status: r.status, hash: r.hash, issuedBy: r.issued_by, issuedAt: r.issued_at.toISOString(),
  signedName: r.signed_name, signedEmail: r.signed_email, signedAt: r.signed_at?.toISOString() ?? null, signedIp: r.signed_ip, voidReason: r.void_reason,
});

export async function listEmployeeDocuments(employeeId: string, sql: Executor = db()): Promise<EmployeeDocument[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<DocRow[]>`SELECT ${sql(DOC_COLUMNS)} FROM ensaar_employee_documents WHERE employee_id = ${employeeId} ORDER BY issued_at DESC LIMIT 50`;
  return rows.map(toDoc);
}

/** A document with its frozen content, scoped to an employee when one is given (the employee portal). */
export async function getEmployeeDocument(id: string, employeeId?: string): Promise<(EmployeeDocument & { document: EmploymentDocument; text: string }) | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const [row] = await sql<DocRow[]>`
    SELECT ${sql([...DOC_COLUMNS, 'document', 'text'])} FROM ensaar_employee_documents
    WHERE id = ${id} ${employeeId ? sql`AND employee_id = ${employeeId}` : sql``}
  `;
  return row ? { ...toDoc(row), document: row.document!, text: row.text! } : null;
}

export function evidenceFor(doc: EmployeeDocument): SignatureEvidence {
  return {
    issuedBy: doc.issuedBy ?? 'Ensaar',
    issuedAt: doc.issuedAt,
    hash: doc.hash,
    signed: doc.status === 'signed' && doc.signedName && doc.signedEmail && doc.signedAt ? { name: doc.signedName, email: doc.signedEmail, at: doc.signedAt } : null,
  };
}

/**
 * Issue a document for the employee to sign: built from their current offer,
 * frozen, fingerprinted, and emailed to them with a link into the portal. An
 * earlier copy of the same kind is voided (kept for the record), signed or not.
 */
export async function issueEmployeeDocument(
  employeeId: string,
  kind: DocumentKind,
  staff: { name: string; label: string },
): Promise<Outcome<{ document: EmployeeDocument; link: string | null }>> {
  const employee = await getEmployee(employeeId);
  if (!employee) return refuse(404, 'No such employee.');
  if (['cancelled', 'exited'].includes(employee.status)) return refuse(409, 'This employee has left or was cancelled.');
  if (!employee.employeeEmail) return refuse(409, "Add the employee's email address first (edit the offer): they sign in to the portal with it.");
  const company = await getCompany(employee.companyId);
  if (!company) return refuse(404, 'No such client.');
  const input = {
    employee,
    customerName: displayName(company),
    issuedOn: todayInIndia(),
    signatory: { name: staff.name, title: 'Authorised Signatory' },
    reference: `ENS-${employee.id.slice(0, 8).toUpperCase()}`,
  };
  const document = kind === 'offer' ? buildOfferLetter(input) : buildEmploymentAgreement(input);
  const text = employmentDocToText(document);
  return requireDatabase().begin(async (tx) => {
    await tx`
      UPDATE ensaar_employee_documents SET status = 'void', voided_at = NOW(), void_reason = ${`Replaced by a new ${DOCUMENT_KINDS[kind].toLowerCase()} issued by ${staff.label}`}
      WHERE employee_id = ${employeeId} AND kind = ${kind} AND status <> 'void'
    `;
    const rows = await tx<DocRow[]>`
      INSERT INTO ensaar_employee_documents (id, employee_id, kind, document, text, hash, issued_by)
      VALUES (${randomUUID()}, ${employeeId}, ${kind}, ${tx.json(document as never)}, ${text}, ${sha256(text)}, ${staff.label})
      RETURNING ${tx(DOC_COLUMNS)}
    `;
    const link = await inviteEmployee(tx, employee, `Your ${DOCUMENT_KINDS[kind].toLowerCase()} from Ensaar is ready for you to read and sign.`);
    await markStep(tx, employee, 'contract_issued', staff.label);
    return ok({ document: toDoc(rows[0]!), link });
  });
}

/** Tick an onboarding checklist step, if the checklist is open and the step not yet done. */
async function markStep(tx: Executor, employee: EorEmployee, step: string, by: string) {
  if (!employee.employeeCase || employee.employeeCase.steps[step]) return;
  await tx`
    UPDATE ensaar_eor_employees
    SET employee_case = jsonb_set(employee_case, ${['steps', step]}, ${tx.json({ doneAt: new Date().toISOString(), doneBy: by } as never)}), updated_at = NOW()
    WHERE id = ${employee.id} AND employee_case IS NOT NULL
  `;
}

/**
 * The employee signs. Who is signing comes from their session (they proved
 * their mailbox); the typed name must be theirs, and the text must be exactly
 * what they were shown.
 */
export async function signEmployeeDocument(
  documentId: string,
  employee: EorEmployee,
  shownHash: string,
  signer: { name: string; ip: string | null; userAgent: string | null },
): Promise<Outcome<EmployeeDocument>> {
  return requireDatabase().begin(async (tx) => {
    const [row] = await tx<DocRow[]>`
      SELECT ${tx([...DOC_COLUMNS, 'text'])} FROM ensaar_employee_documents WHERE id = ${documentId} AND employee_id = ${employee.id} FOR UPDATE
    `;
    if (!row) return refuse(404, 'No such document.');
    if (row.status === 'signed') return refuse(409, 'You have already signed this document.');
    if (row.status === 'void') return refuse(409, 'Ensaar has replaced this document. Reload to see the current one.', { changed: true });
    if (row.hash !== shownHash) return refuse(409, 'The document changed since you opened it. Please read it again.', { changed: true });
    // A signature is in the legal name, as on the PAN, whatever name they work under.
    if (!signatureMatches(signer.name, employee.employeeName)) return refuse(400, `Type your full legal name, ${employee.employeeName}, to sign.`);
    const rows = await tx<DocRow[]>`
      UPDATE ensaar_employee_documents SET status = 'signed', signed_name = ${signer.name}, signed_email = ${employee.employeeEmail},
        signed_at = NOW(), signed_ip = ${signer.ip}, signed_user_agent = ${signer.userAgent}
      WHERE id = ${documentId} RETURNING ${tx(DOC_COLUMNS)}
    `;
    const signed = toDoc(rows[0]!);
    const companyName = employee.companyName ?? 'the client';
    await enqueue(tx, {
      kind: 'team.document.signed',
      to: [employee.employeeEmail!],
      relatedId: employee.id,
      dedupeKey: `team.document.signed:${documentId}`,
      attachments: [{ filename: `Ensaar-${row.kind === 'offer' ? 'Offer-letter' : 'Employment-agreement'}-signed.txt`, content: `${row.text}\n\nSigned electronically by ${signer.name} <${employee.employeeEmail}> at ${signed.signedAt} (UTC).\nDocument fingerprint (SHA-256): ${row.hash}`, contentType: 'text/plain' }],
      ...employeeDocumentSignedEmail({ name: knownAs(employee), kind: row.kind }),
    });
    await enqueue(tx, {
      kind: 'team.document.signed.staff',
      to: await staffRecipients(tx),
      relatedId: employee.companyId,
      ...employeeDocumentSignedStaffEmail({ name: employee.businessName ? `${employee.employeeName} (${employee.businessName})` : employee.employeeName, kind: row.kind, employeeId: employee.id, companyName }),
    });
    // Both documents signed: the checklist step is done.
    const [{ n }] = await tx<{ n: number }[]>`
      SELECT COUNT(DISTINCT kind)::int AS n FROM ensaar_employee_documents WHERE employee_id = ${employee.id} AND status = 'signed'
    `;
    if (n === 2) await markStep(tx, employee, 'contract_signed', 'Employee portal');
    return ok(signed);
  });
}

// --- Tax -------------------------------------------------------------------------------------

export type EmployeeTax = { taxYear: string; regime: Regime; declarations: TaxDeclarations; updatedAt: string | null };

export async function getEmployeeTax(employeeId: string): Promise<EmployeeTax> {
  const fallback = { taxYear: TAX_RULES.taxYear, regime: 'new' as Regime, declarations: EMPTY_DECLARATIONS, updatedAt: null };
  if (!hasDatabase()) return fallback;
  const [row] = await db()<{ regime: Regime; declarations: unknown; updated_at: Date }[]>`
    SELECT regime, declarations, updated_at FROM ensaar_employee_tax WHERE employee_id = ${employeeId} AND tax_year = ${TAX_RULES.taxYear}
  `;
  return row ? { taxYear: TAX_RULES.taxYear, regime: row.regime, declarations: readDeclarations(row.declarations), updatedAt: row.updated_at.toISOString() } : fallback;
}

export async function saveEmployeeTax(employeeId: string, regime: Regime, declarations: TaxDeclarations): Promise<EmployeeTax> {
  const [row] = await requireDatabase()<{ updated_at: Date }[]>`
    INSERT INTO ensaar_employee_tax (employee_id, tax_year, regime, declarations)
    VALUES (${employeeId}, ${TAX_RULES.taxYear}, ${regime}, ${db().json(declarations as never)})
    ON CONFLICT (employee_id, tax_year) DO UPDATE SET regime = EXCLUDED.regime, declarations = EXCLUDED.declarations, updated_at = NOW()
    RETURNING updated_at
  `;
  return { taxYear: TAX_RULES.taxYear, regime, declarations, updatedAt: row!.updated_at.toISOString() };
}

/** The tax picture for one employee: their choice, and both regimes worked out on their salary and declarations. */
export async function taxView(employee: EorEmployee) {
  const tax = await getEmployeeTax(employee.id);
  return { ...tax, comparison: compareRegimes({ annualGross: employee.salaryInr, workState: employee.workState, declarations: tax.declarations }) };
}

// --- Holidays ---------------------------------------------------------------------------------

/** Every client today is a US company (see lib/eor/holidays.ts). */
export const CLIENT_COUNTRY: HolidayCountry = 'US';

export type CalendarEntry = { id: string; country: HolidayCountry; date: string; name: string; createdBy: string | null };

export async function listHolidayCalendar(year?: number): Promise<CalendarEntry[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql<{ id: string; country: HolidayCountry; day: string; name: string; created_by: string | null }[]>`
    SELECT id, country, day::text AS day, name, created_by FROM ensaar_holiday_calendar
    ${year ? sql`WHERE EXTRACT(YEAR FROM day) = ${year}` : sql``}
    ORDER BY day, country, name
  `;
  return rows.map((r) => ({ id: r.id, country: r.country, date: r.day, name: r.name, createdBy: r.created_by }));
}

export async function addHolidayCalendarEntries(country: HolidayCountry, rows: Array<{ date: string; name: string }>, actor: string): Promise<number> {
  let added = 0;
  await requireDatabase().begin(async (tx) => {
    for (const r of rows) {
      const result = await tx`
        INSERT INTO ensaar_holiday_calendar (id, country, day, name, created_by) VALUES (${randomUUID()}, ${country}, ${r.date}, ${r.name}, ${actor})
        ON CONFLICT DO NOTHING
      `;
      added += result.count;
    }
  });
  return added;
}

export async function removeHolidayCalendarEntry(id: string): Promise<boolean> {
  const rows = await requireDatabase()`DELETE FROM ensaar_holiday_calendar WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function holidayCatalogueFor(year: number): Promise<Holiday[]> {
  return holidayCatalogue(year, CLIENT_COUNTRY, await listHolidayCalendar(year));
}

/** A client's holiday calendar for a year. Before anyone proposes one, it is an empty draft. */
export type HolidayPlan = {
  id: string | null;
  companyId: string;
  year: number;
  chosen: string[];
  status: HolidayPlanStatus;
  proposedBy: string | null;
  proposedName: string | null;
  submittedAt: string | null;
  decidedBy: string | null;
  decidedRole: 'client' | 'ensaar' | null;
  decidedAt: string | null;
  note: string | null;
};

type PlanRow = {
  id: string; company_id: string; year: number; chosen: string[]; status: HolidayPlanStatus; proposed_by: string | null; proposed_name: string | null;
  submitted_at: Date | null; decided_by: string | null; decided_role: 'client' | 'ensaar' | null; decided_at: Date | null; note: string | null;
};
const PLAN_COLUMNS = ['id', 'company_id', 'year', 'chosen', 'status', 'proposed_by', 'proposed_name', 'submitted_at', 'decided_by', 'decided_role', 'decided_at', 'note'];
const toPlan = (r: PlanRow): HolidayPlan => ({
  id: r.id, companyId: r.company_id, year: r.year, chosen: r.chosen ?? [], status: r.status, proposedBy: r.proposed_by, proposedName: r.proposed_name,
  submittedAt: r.submitted_at?.toISOString() ?? null, decidedBy: r.decided_by, decidedRole: r.decided_role, decidedAt: r.decided_at?.toISOString() ?? null, note: r.note,
});
const emptyPlan = (companyId: string, year: number): HolidayPlan => ({
  id: null, companyId, year, chosen: [], status: 'draft', proposedBy: null, proposedName: null, submittedAt: null, decidedBy: null, decidedRole: null, decidedAt: null, note: null,
});

export async function getHolidayPlan(companyId: string, year: number, sql: Executor = db()): Promise<HolidayPlan> {
  if (!hasDatabase()) return emptyPlan(companyId, year);
  const [row] = await sql<PlanRow[]>`SELECT ${sql(PLAN_COLUMNS)} FROM ensaar_company_holidays WHERE company_id = ${companyId} AND year = ${year}`;
  return row ? toPlan(row) : emptyPlan(companyId, year);
}

/** What the employee portal, Basecamp and the client portal show: the client's calendar with its holidays spelled out. */
export async function holidayView(companyId: string, year: number) {
  const [catalogue, plan] = await Promise.all([holidayCatalogueFor(year), getHolidayPlan(companyId, year)]);
  const byId = new Map(catalogue.map((h) => [h.id, h]));
  return { year, catalogue, plan, chosen: plan.chosen.map((id) => byId.get(id)).filter((h): h is Holiday => Boolean(h)) };
}

/** Everyone employed for a client who can sign in to the employee portal and has an email address. */
async function companyEmployeeEmails(tx: Executor, companyId: string): Promise<string[]> {
  const rows = await tx<{ employee_email: string }[]>`
    SELECT DISTINCT employee_email FROM ensaar_eor_employees
    WHERE company_id = ${companyId} AND employee_email IS NOT NULL AND status IN ('awaiting_signature', 'signed', 'onboarding', 'active')
  `;
  return rows.map((r) => r.employee_email);
}

/**
 * An employee proposes, or changes, their client's calendar for a year, as a
 * draft or submitted for approval. Every employee of the client works on the
 * same calendar. While the client is reviewing it, or once it is approved, it
 * cannot be changed here: only Ensaar can reopen an approved calendar.
 */
export async function saveHolidayPlan(employee: EorEmployee, year: number, chosen: unknown, submit: boolean): Promise<Outcome<HolidayPlan>> {
  const catalogue = await holidayCatalogueFor(year);
  return requireDatabase().begin(async (tx) => {
    // Lock the client's row (or the client, before anyone has proposed) so two employees cannot race.
    await tx`SELECT id FROM ensaar_eor_companies WHERE id = ${employee.companyId} FOR UPDATE`;
    const current = await getHolidayPlan(employee.companyId, year, tx);
    const company = employee.companyName ?? 'your client';
    if (current.status === 'submitted') return refuse(409, `${company} is reviewing the ${year} calendar${current.proposedName ? ` ${current.proposedName} proposed` : ''}. You can change it if they ask for changes.`);
    if (current.status === 'approved') return refuse(409, `The ${year} calendar is approved for everyone at ${company}. Ask Ensaar if it needs to change.`);
    const check = checkHolidayChoice(catalogue, chosen, { from: todayInIndia(), keep: current.chosen });
    if (!check.ok) return refuse(400, check.error);
    if (submit && check.ids.length === 0) return refuse(400, 'Choose at least one holiday before submitting.');
    const status: HolidayPlanStatus = submit ? 'submitted' : 'draft';
    const rows = await tx<PlanRow[]>`
      INSERT INTO ensaar_company_holidays (id, company_id, year, chosen, status, proposed_by, proposed_name, submitted_at)
      VALUES (${randomUUID()}, ${employee.companyId}, ${year}, ${tx.json(check.ids as never)}, ${status}, ${employee.id}, ${knownAs(employee)}, ${submit ? new Date() : null})
      ON CONFLICT (company_id, year) DO UPDATE SET chosen = EXCLUDED.chosen, status = EXCLUDED.status, proposed_by = EXCLUDED.proposed_by,
        proposed_name = EXCLUDED.proposed_name, submitted_at = EXCLUDED.submitted_at,
        decided_by = NULL, decided_role = NULL, decided_at = NULL, note = NULL, updated_at = NOW()
      RETURNING ${tx(PLAN_COLUMNS)}
    `;
    if (submit) {
      const byId = new Map(catalogue.map((h) => [h.id, h]));
      await enqueue(tx, {
        kind: 'holidays.submitted',
        to: await companyRecipients(tx, employee.companyId),
        relatedId: employee.companyId,
        ...holidaysSubmittedEmail({
          companyName: employee.companyName ?? 'your company',
          employeeName: knownAs(employee),
          year,
          holidays: check.ids.map((id) => byId.get(id)!).map((h) => `${h.name}, ${formatDay(h.date)}${h.country === 'IN' ? '' : ' (United States)'}`),
        }),
      });
    }
    return ok(toPlan(rows[0]!));
  });
}

/**
 * Approve the calendar, or ask for changes. The client decides a submitted
 * calendar; Ensaar can decide any calendar that has been submitted, at any time,
 * which overrides the client (asking for changes reopens an approved one).
 * Approval is announced to all the client's employees; a request for changes
 * goes to the employee who proposed it.
 */
export async function decideHolidayPlan(input: {
  companyId: string;
  year: number;
  approve: boolean;
  note: string | null;
  by: string;
  role: 'client' | 'ensaar';
}): Promise<Outcome<HolidayPlan>> {
  return requireDatabase().begin(async (tx) => {
    const [row] = await tx<(PlanRow & { company_name: string; legal_name: string | null })[]>`
      SELECT ${tx(PLAN_COLUMNS.map((c) => `h.${c}`))}, c.company_name, c.company->>'legalName' AS legal_name
      FROM ensaar_company_holidays h JOIN ensaar_eor_companies c ON c.id = h.company_id
      WHERE h.company_id = ${input.companyId} AND h.year = ${input.year} FOR UPDATE OF h
    `;
    if (!row || row.status === 'draft') return refuse(409, `No ${input.year} calendar has been submitted yet.`);
    if (input.role === 'client' && row.status !== 'submitted') return refuse(409, 'This calendar has already been decided.');
    const note = input.note?.trim() || null;
    if (!input.approve && !note) return refuse(400, 'Say what should change.');
    const rows = await tx<PlanRow[]>`
      UPDATE ensaar_company_holidays SET status = ${input.approve ? 'approved' : 'rejected'}, decided_by = ${input.by}, decided_role = ${input.role},
        decided_at = NOW(), note = ${note}, updated_at = NOW()
      WHERE id = ${row.id} RETURNING ${tx(PLAN_COLUMNS)}
    `;
    const companyName = row.legal_name ?? row.company_name;
    let to: string[] = [];
    if (input.approve) to = await companyEmployeeEmails(tx, input.companyId);
    else if (row.proposed_by) {
      const [p] = await tx<{ employee_email: string | null }[]>`SELECT employee_email FROM ensaar_eor_employees WHERE id = ${row.proposed_by}`;
      if (p?.employee_email) to = [p.employee_email];
    }
    if (to.length) {
      await enqueue(tx, {
        kind: 'holidays.decided',
        to,
        relatedId: input.companyId,
        ...holidaysDecidedEmail({ companyName, year: input.year, approved: input.approve, note, byEnsaar: input.role === 'ensaar' }),
      });
    }
    return ok(toPlan(rows[0]!));
  });
}

export { holidayId };
