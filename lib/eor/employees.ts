import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { agreementToText, buildSchedule } from './agreement';
import {
  displayName,
  evidenceText,
  getTemplateApproval,
  lockCompany,
  sha256,
  type EorCompany,
  type Tx,
} from './companies';
import { schedulesCountersignedEmail, schedulesReadyEmail, schedulesSignedCustomerEmail, schedulesSignedStaffEmail } from './email';
import {
  employeeSteps,
  isEmployeeStatus,
  knownAs,
  masterSigned,
  todayInIndia,
  type EmployeeCase,
  type EmployeeInput,
  type EmployeeStatus,
} from './onboarding';
import { likePattern, ok, pageArgs, refuse, type Outcome, type Page } from './outcome';
import { companyRecipients } from './portal-auth';

/*
 * Employees of a client company. Each moves through:
 *
 *   draft -> awaiting_signature -> signed -> onboarding -> active -> exited
 *
 * "awaiting_signature" freezes the Schedule A text (and its hash) at the moment
 * it is sent; the customer's signatory signs exactly that text; Ensaar
 * countersigns, which opens the onboarding checklist. Editing a sent or signed
 * schedule rebuilds it, and a signature on the old text is voided into history.
 *
 * Batch operations (send, sign, countersign) run in one transaction under the
 * company lock and are all-or-nothing.
 */

export const MAX_BATCH = 500;

export type EorEmployee = EmployeeInput & {
  /** To greet them in their documents, when not the first word of the legal name. */
  givenName: string | null;
  id: string;
  companyId: string;
  companyName?: string;
  status: EmployeeStatus;
  scheduleNumber: number | null;
  scheduleVersion: string | null;
  scheduleHash: string | null;
  signedName: string | null;
  signedEmail: string | null;
  signedAt: string | null;
  signedIp: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
  employeeCase: EmployeeCase | null;
  exitDate: string | null;
  exitReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  company_id: string;
  company_name?: string;
  status: string;
  employee_name: string;
  business_name: string | null;
  given_name: string | null;
  employee_email: string | null;
  job_title: string;
  salary_inr: string | number;
  start_date: string;
  work_state: string;
  pricing: string;
  monthly_fee_usd: number | null;
  loaded_cost_usd: number | null;
  deposit_required: boolean;
  notes: string | null;
  schedule_number: number | null;
  schedule_version: string | null;
  schedule_hash: string | null;
  signed_name: string | null;
  signed_email: string | null;
  signed_at: Date | null;
  signed_ip: string | null;
  countersigned_by: string | null;
  countersigned_at: Date | null;
  employee_case: EmployeeCase | null;
  exit_date: string | null;
  exit_reason: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS = [
  'id', 'company_id', 'status', 'employee_name', 'business_name', 'given_name', 'employee_email', 'job_title', 'salary_inr', 'start_date', 'work_state',
  'pricing', 'monthly_fee_usd', 'loaded_cost_usd', 'deposit_required', 'notes', 'schedule_number', 'schedule_version', 'schedule_hash', 'signed_name', 'signed_email',
  'signed_at', 'signed_ip', 'countersigned_by', 'countersigned_at', 'employee_case', 'exit_date', 'exit_reason',
  'created_by', 'created_at', 'updated_at',
];

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toEmployee(r: Row): EorEmployee {
  return {
    id: r.id,
    companyId: r.company_id,
    ...(r.company_name !== undefined ? { companyName: r.company_name } : {}),
    status: r.status as EmployeeStatus,
    employeeName: r.employee_name,
    businessName: r.business_name,
    givenName: r.given_name,
    employeeEmail: r.employee_email,
    jobTitle: r.job_title,
    salaryInr: Number(r.salary_inr),
    startDate: r.start_date,
    workState: r.work_state,
    pricing: r.pricing === 'loaded' ? 'loaded' : 'fee',
    monthlyFeeUsd: r.monthly_fee_usd,
    loadedCostUsd: r.loaded_cost_usd,
    depositRequired: r.deposit_required,
    notes: r.notes,
    scheduleNumber: r.schedule_number,
    scheduleVersion: r.schedule_version,
    scheduleHash: r.schedule_hash,
    signedName: r.signed_name,
    signedEmail: r.signed_email,
    signedAt: iso(r.signed_at),
    signedIp: r.signed_ip,
    countersignedBy: r.countersigned_by,
    countersignedAt: iso(r.countersigned_at),
    employeeCase: r.employee_case,
    exitDate: r.exit_date,
    exitReason: r.exit_reason,
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

// --- Reading ----------------------------------------------------------------------------

export type EmployeeFilter = EmployeeStatus | 'all' | 'current' | 'needs_action' | 'starting_soon';

/**
 * Employees a page at a time, for one company or across all of them.
 * "current" hides cancelled and exited people; "needs_action" is what Ensaar
 * owes (schedules to countersign, onboardings whose start date is within a
 * week or past); "starting_soon" is onboardings starting in the next 14 days.
 */
export async function listEmployees(input: {
  companyId?: string | null;
  q?: string | null;
  filter?: EmployeeFilter;
  page?: unknown;
  pageSize?: unknown;
  /** The customer never sees drafts. */
  hideDrafts?: boolean;
}): Promise<Page<EorEmployee> & { counts: Record<string, number> }> {
  const { page, pageSize, offset } = pageArgs(input, 25);
  if (!hasDatabase()) return { items: [], total: 0, page, pageSize, counts: {} };
  const sql = db();
  const like = likePattern(input.q);
  const filter = input.filter ?? 'current';
  const today = todayInIndia();
  const soon = todayInIndia(new Date(Date.now() + 14 * 86_400_000));
  const week = todayInIndia(new Date(Date.now() + 7 * 86_400_000));

  const scope = sql`
    ${input.companyId ? sql`AND e.company_id = ${input.companyId}` : sql``}
    ${input.hideDrafts ? sql`AND e.status <> 'draft'` : sql``}
    ${like ? sql`AND (e.employee_name ILIKE ${like} OR e.business_name ILIKE ${like} OR e.job_title ILIKE ${like} OR e.employee_email ILIKE ${like}
                 ${input.companyId ? sql`` : sql`OR c.company_name ILIKE ${like} OR c.company->>'legalName' ILIKE ${like}`})` : sql``}
  `;
  const byFilter =
    filter === 'all'
      ? sql``
      : filter === 'current'
        ? sql`AND e.status NOT IN ('cancelled', 'exited')`
        : filter === 'needs_action'
          ? sql`AND (e.status = 'signed' OR (e.status = 'onboarding' AND e.start_date <= ${week}))`
          : filter === 'starting_soon'
            ? sql`AND e.status IN ('onboarding', 'signed', 'awaiting_signature') AND e.start_date BETWEEN ${today} AND ${soon}`
            : isEmployeeStatus(filter)
              ? sql`AND e.status = ${filter}`
              : sql``;

  const from = sql`FROM ensaar_eor_employees e JOIN ensaar_eor_companies c ON c.id = e.company_id`;
  const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total ${from} WHERE TRUE ${scope} ${byFilter}`;
  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS.map((c) => `e.${c}`))}, COALESCE(c.company->>'legalName', c.company_name) AS company_name
    ${from} WHERE TRUE ${scope} ${byFilter}
    ORDER BY (e.status = 'signed') DESC, e.start_date ASC, e.employee_name ASC, e.id
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const countRows = await sql<{ status: string; n: number }[]>`
    SELECT e.status, COUNT(*)::int AS n ${from} WHERE TRUE ${scope} GROUP BY e.status
  `;
  return {
    items: rows.map(toEmployee),
    total,
    page,
    pageSize,
    counts: Object.fromEntries(countRows.map((r) => [r.status, r.n])),
  };
}

export async function getEmployee(id: string, companyId?: string): Promise<EorEmployee | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const [row] = await sql<Row[]>`
    SELECT ${sql(COLUMNS.map((c) => `e.${c}`))}, COALESCE(c.company->>'legalName', c.company_name) AS company_name
    FROM ensaar_eor_employees e JOIN ensaar_eor_companies c ON c.id = e.company_id
    WHERE e.id = ${id} ${companyId ? sql`AND e.company_id = ${companyId}` : sql``}
  `;
  return row ? toEmployee(row) : null;
}

export async function getScheduleText(id: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  const [row] = await db()<{ schedule_text: string | null }[]>`SELECT schedule_text FROM ensaar_eor_employees WHERE id = ${id}`;
  return row?.schedule_text ?? null;
}

async function lockEmployees(tx: Tx, companyId: string, ids: string[]): Promise<EorEmployee[]> {
  const rows = await tx<Row[]>`
    SELECT ${tx(COLUMNS)} FROM ensaar_eor_employees WHERE company_id = ${companyId} AND id IN ${tx(ids)} FOR UPDATE
  `;
  return rows.map(toEmployee);
}

// --- Schedule text ---------------------------------------------------------------------

function scheduleFor(company: EorCompany, employee: EmployeeInput, number: number) {
  const doc = buildSchedule({ number, companyName: company.companyName, company: company.company, masterHash: company.agreementHash, employee });
  const text = agreementToText(doc);
  return { doc, text, hash: sha256(text) };
}

async function nextScheduleNumber(tx: Tx, companyId: string): Promise<number> {
  const [{ n }] = await tx<{ n: number }[]>`SELECT COALESCE(MAX(schedule_number), 0)::int + 1 AS n FROM ensaar_eor_employees WHERE company_id = ${companyId}`;
  return n;
}

/**
 * Rebuild the frozen text of schedules still awaiting signature, after the
 * company's details change (a corrected legal name must appear on them).
 * Called under the company lock by saveCompanyDetails.
 */
export async function rebuildPendingSchedules(tx: Tx, company: EorCompany): Promise<void> {
  const pending = await tx<Row[]>`
    SELECT ${tx(COLUMNS)} FROM ensaar_eor_employees WHERE company_id = ${company.id} AND status = 'awaiting_signature' FOR UPDATE
  `;
  for (const row of pending.map(toEmployee)) {
    const s = scheduleFor(company, row, row.scheduleNumber!);
    await tx`UPDATE ensaar_eor_employees SET schedule_version = ${s.doc.version}, schedule_text = ${s.text}, schedule_hash = ${s.hash}, updated_at = NOW() WHERE id = ${row.id}`;
  }
}

// --- Staff: adding and sending ------------------------------------------------------------

/**
 * Add employees (one from the form, or hundreds from a CSV) as drafts. With
 * `send`, they go straight to the customer for signature.
 */
export async function addEmployees(
  companyId: string,
  inputs: EmployeeInput[],
  actor: string,
  options: { send?: boolean } = {},
): Promise<Outcome<EorEmployee[]>> {
  if (inputs.length === 0) return refuse(400, 'Add at least one employee.');
  if (inputs.length > MAX_BATCH) return refuse(400, `Add at most ${MAX_BATCH} employees at a time.`);
  const created = await requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'cancelled') return refuse(409, 'This client is cancelled.');
    const out: EorEmployee[] = [];
    for (const e of inputs) {
      const rows = await tx<Row[]>`
        INSERT INTO ensaar_eor_employees (id, company_id, employee_name, business_name, employee_email, job_title, salary_inr, start_date,
                                          work_state, pricing, monthly_fee_usd, loaded_cost_usd, deposit_required, notes, created_by)
        VALUES (${randomUUID()}, ${companyId}, ${e.employeeName}, ${e.businessName}, ${e.employeeEmail}, ${e.jobTitle}, ${e.salaryInr},
                ${e.startDate}, ${e.workState}, ${e.pricing}, ${e.monthlyFeeUsd}, ${e.loadedCostUsd}, ${e.depositRequired}, ${e.notes}, ${actor})
        RETURNING ${tx(COLUMNS)}
      `;
      out.push(toEmployee(rows[0]!));
    }
    return ok(out);
  });
  if (!created.ok || !options.send) return created;
  const sent = await sendForSignature(companyId, created.value.map((e) => e.id));
  return sent.ok ? ok(sent.value) : sent;
}

/**
 * Send drafts to the customer: number them, freeze each Schedule A, and email
 * the signatory once for the whole batch (or the contacts, if no signatory is
 * named yet).
 */
export async function sendForSignature(companyId: string, ids: string[]): Promise<Outcome<EorEmployee[]>> {
  if (ids.length === 0) return refuse(400, 'Choose at least one employee.');
  if (ids.length > MAX_BATCH) return refuse(400, `Send at most ${MAX_BATCH} at a time.`);
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'cancelled') return refuse(409, 'This client is cancelled.');
    const employees = await lockEmployees(tx, companyId, ids);
    const notDraft = employees.filter((e) => e.status !== 'draft');
    if (employees.length !== ids.length || notDraft.length) {
      return refuse(409, `Only drafts can be sent. ${notDraft.map((e) => e.employeeName).slice(0, 5).join(', ') || 'Some employees were not found'}.`);
    }
    let number = await nextScheduleNumber(tx, companyId);
    const out: EorEmployee[] = [];
    for (const e of employees.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const s = scheduleFor(company, e, number);
      const rows = await tx<Row[]>`
        UPDATE ensaar_eor_employees SET status = 'awaiting_signature', schedule_number = ${number}, schedule_version = ${s.doc.version},
          schedule_text = ${s.text}, schedule_hash = ${s.hash}, updated_at = NOW()
        WHERE id = ${e.id} RETURNING ${tx(COLUMNS)}
      `;
      out.push(toEmployee(rows[0]!));
      number++;
    }
    const signatory = company.company?.signatoryEmail;
    await enqueue(tx, {
      kind: 'eor.schedules.ready',
      to: signatory ? [signatory] : await companyRecipients(tx, companyId),
      relatedId: companyId,
      ...schedulesReadyEmail({ name: company.company?.signatoryName ?? company.contactName, companyName: displayName(company), employees: out }),
    });
    return ok(out);
  });
}

// --- Customer: signing ------------------------------------------------------------------

/**
 * The signatory signs one or many schedules. All-or-nothing, under the company
 * lock: the master agreement must be signed, the signed-in person must be the
 * named signatory, each schedule's version legally approved, and each text
 * exactly the one they were shown.
 */
export async function signSchedules(
  companyId: string,
  items: Array<{ id: string; hash: string }>,
  signer: { name: string; email: string; ip: string | null; userAgent: string | null },
): Promise<Outcome<EorEmployee[]>> {
  if (items.length === 0) return refuse(400, 'Choose at least one schedule to sign.');
  if (items.length > MAX_BATCH) return refuse(400, `Sign at most ${MAX_BATCH} at a time.`);
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!masterSigned(company.status)) return refuse(409, 'Sign the Employer of Record agreement first; each schedule is part of it.');
    const details = company.company!;
    if (details.signatoryEmail.toLowerCase() !== signer.email.toLowerCase()) {
      return refuse(403, `Only ${details.signatoryName} (${details.signatoryEmail}) can sign for ${details.legalName}.`);
    }
    const employees = await lockEmployees(tx, companyId, items.map((i) => i.id));
    if (employees.length !== items.length) return refuse(404, 'One of those employees could not be found.');
    const byId = new Map(employees.map((e) => [e.id, e]));
    for (const item of items) {
      const e = byId.get(item.id)!;
      if (e.status !== 'awaiting_signature') return refuse(409, `${e.employeeName}'s schedule is not waiting for a signature.`);
      if (e.scheduleHash !== item.hash) {
        return refuse(409, `${e.employeeName}'s schedule changed since you opened it. Please review it again.`, { changed: true });
      }
      if (!(await getTemplateApproval(e.scheduleVersion ?? '', tx))) {
        return refuse(423, 'The agreement is being finalised by our legal team. We will email you as soon as it is ready to sign.');
      }
    }
    const signed: EorEmployee[] = [];
    for (const item of items) {
      const rows = await tx<Row[]>`
        UPDATE ensaar_eor_employees SET status = 'signed', signed_name = ${signer.name}, signed_email = ${signer.email.toLowerCase()},
          signed_at = NOW(), signed_ip = ${signer.ip}, signed_user_agent = ${signer.userAgent}, updated_at = NOW()
        WHERE id = ${item.id} RETURNING ${tx(COLUMNS)}
      `;
      signed.push(toEmployee(rows[0]!));
    }
    const texts = await tx<{ id: string; schedule_text: string }[]>`SELECT id, schedule_text FROM ensaar_eor_employees WHERE id IN ${tx(signed.map((e) => e.id))}`;
    const textById = new Map(texts.map((t) => [t.id, t.schedule_text]));
    const bundle = signed
      .map((e) => evidenceText(textById.get(e.id) ?? '', { name: e.signedName, title: details.signatoryTitle, email: e.signedEmail, at: e.signedAt }, { by: null, at: null }, e.scheduleHash, details.legalName))
      .join('\n\n----------------------------------------\n\n');
    const batchKey = sha256(signed.map((e) => `${e.id}:${e.scheduleHash}`).join('|'));
    await enqueue(tx, {
      kind: 'eor.schedules.signed.staff',
      to: await staffRecipients(tx),
      relatedId: companyId,
      dedupeKey: `eor.schedules.signed.staff:${batchKey}`,
      ...schedulesSignedStaffEmail({ companyName: details.legalName, signer: details.signatoryTitle ? `${signer.name} (${details.signatoryTitle})` : signer.name, count: signed.length, companyId }),
    });
    await enqueue(tx, {
      kind: 'eor.schedules.signed.customer',
      to: await companyRecipients(tx, companyId),
      relatedId: companyId,
      dedupeKey: `eor.schedules.signed.customer:${batchKey}`,
      attachments: [{ filename: `Ensaar-Schedules-signed-${signed.length}.txt`, content: bundle, contentType: 'text/plain' }],
      ...schedulesSignedCustomerEmail({ name: signer.name, companyName: details.legalName, employees: signed.map((e) => knownAs(e)) }),
    });
    return ok(signed);
  });
}

// --- Staff: countersigning and after -------------------------------------------------------

/**
 * Countersign signed schedules, which starts each employee's onboarding. The
 * master agreement must be countersigned first. A start date already passed
 * needs explicit confirmation (it is recorded in the audit log by the route).
 */
export async function countersignSchedules(
  companyId: string,
  ids: string[],
  countersignedBy: string,
  options: { confirmPastStart?: boolean } = {},
): Promise<Outcome<EorEmployee[]>> {
  if (ids.length === 0) return refuse(400, 'Choose at least one employee.');
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status !== 'active') return refuse(409, 'Countersign the master agreement first.');
    const employees = await lockEmployees(tx, companyId, ids);
    if (employees.length !== ids.length) return refuse(404, 'One of those employees could not be found.');
    const notSigned = employees.filter((e) => e.status !== 'signed');
    if (notSigned.length) return refuse(409, `Not signed by the customer yet: ${notSigned.map((e) => e.employeeName).slice(0, 5).join(', ')}.`);
    const past = employees.filter((e) => e.startDate < todayInIndia());
    if (past.length && !options.confirmPastStart) {
      return refuse(409, `The start date has passed for ${past.map((e) => e.employeeName).slice(0, 5).join(', ')}. Edit the date (the customer re-signs), or confirm a backdated start.`);
    }
    const out: EorEmployee[] = [];
    for (const e of employees) {
      const employeeCase: EmployeeCase = {
        owner: countersignedBy,
        dueDate: e.startDate,
        steps: Object.fromEntries(employeeSteps(e).map((s) => [s.key, null])),
      };
      // The offer letter and agreement may already be out, or signed, before the checklist opens.
      const docs = await tx<{ kind: string; status: string; issued_by: string | null; issued_at: Date; signed_at: Date | null }[]>`
        SELECT kind, status, issued_by, issued_at, signed_at FROM ensaar_employee_documents WHERE employee_id = ${e.id} AND status <> 'void' ORDER BY issued_at
      `;
      if (docs.length && 'contract_issued' in employeeCase.steps) {
        employeeCase.steps.contract_issued = { doneAt: docs[0]!.issued_at.toISOString(), doneBy: docs[0]!.issued_by ?? 'Ensaar' };
      }
      const signed = docs.filter((d) => d.status === 'signed');
      if (new Set(signed.map((d) => d.kind)).size === 2 && 'contract_signed' in employeeCase.steps) {
        const last = signed.reduce((a, b) => (a.signed_at! > b.signed_at! ? a : b));
        employeeCase.steps.contract_signed = { doneAt: last.signed_at!.toISOString(), doneBy: 'Employee portal' };
      }
      const rows = await tx<Row[]>`
        UPDATE ensaar_eor_employees SET status = 'onboarding', countersigned_by = ${countersignedBy}, countersigned_at = NOW(),
          employee_case = ${tx.json(employeeCase as never)}, updated_at = NOW()
        WHERE id = ${e.id} RETURNING ${tx(COLUMNS)}
      `;
      out.push(toEmployee(rows[0]!));
    }
    const texts = await tx<{ id: string; schedule_text: string }[]>`SELECT id, schedule_text FROM ensaar_eor_employees WHERE id IN ${tx(ids)}`;
    const textById = new Map(texts.map((t) => [t.id, t.schedule_text]));
    const bundle = out
      .map((e) =>
        evidenceText(textById.get(e.id) ?? '', { name: e.signedName, title: company.company?.signatoryTitle ?? null, email: e.signedEmail, at: e.signedAt }, { by: e.countersignedBy, at: e.countersignedAt }, e.scheduleHash, displayName(company)),
      )
      .join('\n\n----------------------------------------\n\n');
    await enqueue(tx, {
      kind: 'eor.schedules.countersigned',
      to: await companyRecipients(tx, companyId),
      relatedId: companyId,
      attachments: [{ filename: `Ensaar-Schedules-executed-${out.length}.txt`, content: bundle, contentType: 'text/plain' }],
      ...schedulesCountersignedEmail({ companyName: displayName(company), employees: out }),
    });
    return ok(out);
  });
}

async function voidSchedule(tx: Tx, employee: EorEmployee, actor: string, reason: string) {
  await tx`
    INSERT INTO ensaar_eor_voided_signatures (id, company_id, employee_id, kind, agreement_version, agreement_text, agreement_hash,
      signed_name, signed_email, signed_at, signed_ip, voided_by, void_reason)
    SELECT ${randomUUID()}, company_id, id, 'schedule', schedule_version, schedule_text, schedule_hash, signed_name, signed_email,
      signed_at, signed_ip, ${actor}, ${reason}
    FROM ensaar_eor_employees WHERE id = ${employee.id}
  `;
}

/**
 * Correct an employee's terms before onboarding starts. A schedule already sent
 * is rebuilt (same number) and a signature on the old text is voided into
 * history; the signatory is asked to sign the new text.
 */
export async function updateEmployee(id: string, input: EmployeeInput, actor: string): Promise<Outcome<EorEmployee>> {
  const current = await getEmployee(id);
  if (!current) return refuse(404, 'No such employee.');
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, current.companyId);
    const [locked] = await lockEmployees(tx, current.companyId, [id]);
    if (!company || !locked) return refuse(404, 'No such employee.');
    if (!['draft', 'awaiting_signature', 'signed'].includes(locked.status)) {
      return refuse(409, 'Onboarding has started, so the offer cannot be edited here. Record the change with the employee and payroll.');
    }
    const wasSigned = locked.status === 'signed';
    if (wasSigned) await voidSchedule(tx, locked, actor, 'Employee terms changed by Ensaar');
    const sent = locked.status !== 'draft';
    const s = sent ? scheduleFor(company, input, locked.scheduleNumber!) : null;
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_employees SET employee_name = ${input.employeeName}, business_name = ${input.businessName}, employee_email = ${input.employeeEmail},
        job_title = ${input.jobTitle}, salary_inr = ${input.salaryInr}, start_date = ${input.startDate}, work_state = ${input.workState},
        pricing = ${input.pricing}, monthly_fee_usd = ${input.monthlyFeeUsd}, loaded_cost_usd = ${input.loadedCostUsd}, deposit_required = ${input.depositRequired}, notes = ${input.notes},
        status = ${sent ? 'awaiting_signature' : 'draft'},
        schedule_version = ${s?.doc.version ?? null}, schedule_text = ${s?.text ?? null}, schedule_hash = ${s?.hash ?? null},
        signed_name = NULL, signed_email = NULL, signed_at = NULL, signed_ip = NULL, signed_user_agent = NULL, updated_at = NOW()
      WHERE id = ${id} RETURNING ${tx(COLUMNS)}
    `;
    const updated = toEmployee(rows[0]!);
    if (sent) {
      const signatory = company.company?.signatoryEmail;
      await enqueue(tx, {
        kind: 'eor.schedules.ready',
        to: signatory ? [signatory] : await companyRecipients(tx, company.id),
        relatedId: company.id,
        ...schedulesReadyEmail({
          name: company.company?.signatoryName ?? company.contactName,
          companyName: displayName(company),
          employees: [updated],
          reason: wasSigned
            ? `Ensaar updated ${knownAs(updated)}'s terms after you signed, so the earlier signature no longer applies. Please review and sign the updated schedule:`
            : `Ensaar updated ${knownAs(updated)}'s schedule. Please review and sign the updated version:`,
        }),
      });
    }
    return ok(updated);
  });
}

/** Tick a checklist step, change the owner, mark active, record an exit, or cancel. */
export async function changeEmployee(
  id: string,
  change:
    | { kind: 'step'; step: string; done: boolean }
    | { kind: 'owner'; owner: string }
    | { kind: 'activate' }
    | { kind: 'exit'; exitDate: string; reason: string }
    | { kind: 'cancel' },
  actor: string,
): Promise<Outcome<EorEmployee>> {
  const current = await getEmployee(id);
  if (!current) return refuse(404, 'No such employee.');
  return requireDatabase().begin(async (tx) => {
    await lockCompany(tx, current.companyId);
    const [e] = await lockEmployees(tx, current.companyId, [id]);
    if (!e) return refuse(404, 'No such employee.');
    const save = async (fields: postgres.PendingQuery<postgres.Row[]>) => {
      const rows = await tx<Row[]>`UPDATE ensaar_eor_employees SET ${fields}, updated_at = NOW() WHERE id = ${id} RETURNING ${tx(COLUMNS)}`;
      return ok(toEmployee(rows[0]!));
    };
    switch (change.kind) {
      case 'step':
      case 'owner': {
        if (!e.employeeCase || !['onboarding', 'active'].includes(e.status)) return refuse(409, 'The checklist opens when the schedule is countersigned.');
        const next: EmployeeCase = { ...e.employeeCase, steps: { ...e.employeeCase.steps } };
        if (change.kind === 'step') {
          if (!employeeSteps(e).some((s) => s.key === change.step)) return refuse(400, 'Unknown step.');
          next.steps[change.step] = change.done ? { doneAt: new Date().toISOString(), doneBy: actor } : null;
        } else {
          next.owner = change.owner.trim().slice(0, 200) || null;
        }
        return save(tx`employee_case = ${tx.json(next as never)}`);
      }
      case 'activate':
        if (e.status !== 'onboarding') return refuse(409, 'Only an employee in onboarding can be marked active.');
        return save(tx`status = 'active'`);
      case 'exit':
        if (!['onboarding', 'active'].includes(e.status)) return refuse(409, 'Only a current employee can exit.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(change.exitDate)) return refuse(400, 'Enter the last working day.');
        if (change.reason.trim().length < 3) return refuse(400, 'Say why they are leaving.');
        return save(tx`status = 'exited', exit_date = ${change.exitDate}, exit_reason = ${change.reason.trim().slice(0, 500)}`);
      case 'cancel':
        if (!['draft', 'awaiting_signature', 'signed'].includes(e.status)) return refuse(409, 'Onboarding has started; record an exit instead.');
        if (e.status === 'signed') await voidSchedule(tx, e, actor, 'Hire cancelled by Ensaar');
        return save(tx`status = 'cancelled'`);
    }
  });
}


/**
 * Set the given name the employee's documents greet them by. It is not part of
 * the Schedule A, so the client is not asked to sign again; documents issued
 * after the change use it.
 */
export async function setGivenName(id: string, input: unknown): Promise<Outcome<EorEmployee>> {
  const name = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
  if (name && name.length < 2) return refuse(400, 'Enter the given name in full, or leave it blank to use the first word of the legal name.');
  const rows = await requireDatabase()<Row[]>`
    UPDATE ensaar_eor_employees SET given_name = ${name || null}, updated_at = NOW() WHERE id = ${id} RETURNING ${requireDatabase()(COLUMNS)}
  `;
  return rows[0] ? ok(toEmployee(rows[0])) : refuse(404, 'No such employee.');
}
