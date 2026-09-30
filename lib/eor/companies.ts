import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { AGREEMENT_VERSION, agreementToText, buildMasterAgreement, type AgreementDocument } from './agreement';
import {
  companyApprovedEmail,
  companyChangesEmail,
  masterSignedCustomerEmail,
  masterSignedStaffEmail,
} from './email';
import {
  DOCUMENT_KINDS,
  MAX_DOCUMENTS,
  isCompanyEditable,
  missingRequiredDocuments,
  signatureBlockers,
  unacceptedRequiredDocuments,
  type CompanyDetails,
  type CompanyInvite,
  type CompanyStatus,
  type DocumentReview,
} from './onboarding';
import { likePattern, ok, pageArgs, refuse, type Outcome, type Page } from './outcome';
import { companyRecipients, ensurePortalUser, requestSignature } from './portal-auth';

/*
 * A client company: verified once, one master agreement, many employees
 * (lib/eor/employees.ts). Every change locks the company row first
 * (SELECT ... FOR UPDATE) and re-checks what it depends on, so document
 * changes, signing and review take turns per company.
 */

export type Tx = postgres.TransactionSql;
type Executor = postgres.Sql | Tx;

export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

export type EorCompany = {
  id: string;
  status: CompanyStatus;
  companyName: string;
  contactName: string;
  contactEmail: string;
  notes: string | null;
  company: CompanyDetails | null;
  /** The Ensaar person who entered the details for the customer; null when the customer did. */
  detailsEnteredBy: string | null;
  agreementVersion: string | null;
  agreementHash: string | null;
  signedName: string | null;
  signedTitle: string | null;
  signedEmail: string | null;
  signedAt: string | null;
  signedIp: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
  changesNote: string | null;
  changesRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Headcount by status, for lists and the company header. */
export type EmployeeCounts = {
  total: number;
  draft: number;
  awaitingSignature: number;
  toCountersign: number;
  onboarding: number;
  active: number;
  exited: number;
};

export type CompanyListItem = EorCompany & { counts: EmployeeCounts; documentsToReview: number };

type Row = {
  id: string;
  status: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  notes: string | null;
  company: CompanyDetails | null;
  details_entered_by: string | null;
  agreement_version: string | null;
  agreement_hash: string | null;
  signed_name: string | null;
  signed_title: string | null;
  signed_email: string | null;
  signed_at: Date | null;
  signed_ip: string | null;
  countersigned_by: string | null;
  countersigned_at: Date | null;
  changes_note: string | null;
  changes_requested_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const COMPANY_COLUMNS = [
  'id', 'status', 'company_name', 'contact_name', 'contact_email', 'notes', 'company', 'details_entered_by',
  'agreement_version', 'agreement_hash', 'signed_name', 'signed_title', 'signed_email', 'signed_at', 'signed_ip',
  'countersigned_by', 'countersigned_at', 'changes_note', 'changes_requested_at', 'created_at', 'updated_at',
];

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toCompany(row: Row): EorCompany {
  return {
    id: row.id,
    status: row.status as CompanyStatus,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    notes: row.notes,
    company: row.company,
    detailsEnteredBy: row.details_entered_by,
    agreementVersion: row.agreement_version,
    agreementHash: row.agreement_hash,
    signedName: row.signed_name,
    signedTitle: row.signed_title,
    signedEmail: row.signed_email,
    signedAt: iso(row.signed_at),
    signedIp: row.signed_ip,
    countersignedBy: row.countersigned_by,
    countersignedAt: iso(row.countersigned_at),
    changesNote: row.changes_note,
    changesRequestedAt: iso(row.changes_requested_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The name to put on documents: the legal name once the customer has given it. */
export const displayName = (c: Pick<EorCompany, 'companyName' | 'company'>) => c.company?.legalName ?? c.companyName;

export async function lockCompany(tx: Tx, id: string): Promise<EorCompany | null> {
  const rows = await tx<Row[]>`SELECT ${tx(COMPANY_COLUMNS)} FROM ensaar_eor_companies WHERE id = ${id} FOR UPDATE`;
  return rows[0] ? toCompany(rows[0]) : null;
}

export async function getCompany(id: string): Promise<EorCompany | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`SELECT ${sql(COMPANY_COLUMNS)} FROM ensaar_eor_companies WHERE id = ${id}`;
  return rows[0] ? toCompany(rows[0]) : null;
}

export async function getSignedMasterText(id: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  const [row] = await db()<{ agreement_text: string | null }[]>`SELECT agreement_text FROM ensaar_eor_companies WHERE id = ${id}`;
  return row?.agreement_text ?? null;
}

export function masterDraft(company: EorCompany): AgreementDocument {
  return buildMasterAgreement(company.companyName, company.company);
}

// --- Listing ------------------------------------------------------------------------------

export type CompanyFilter = 'all' | 'needs_action' | 'setting_up' | 'active' | 'cancelled';

/**
 * Companies with their headcount, a page at a time. "Needs action" means Ensaar
 * owes something: a master agreement or schedules to countersign, or documents
 * waiting for review.
 */
export async function listCompanies(input: { q?: string | null; filter?: CompanyFilter; page?: unknown; pageSize?: unknown }): Promise<Page<CompanyListItem>> {
  const { page, pageSize, offset } = pageArgs(input, 25);
  if (!hasDatabase()) return { items: [], total: 0, page, pageSize };
  const sql = db();
  const like = likePattern(input.q);
  const filter = input.filter ?? 'all';

  const where = sql`
    WHERE TRUE
    ${like ? sql`AND (c.company_name ILIKE ${like} OR c.company->>'legalName' ILIKE ${like} OR c.contact_email ILIKE ${like}
                 OR EXISTS (SELECT 1 FROM ensaar_eor_employees e WHERE e.company_id = c.id AND e.employee_name ILIKE ${like}))` : sql``}
    ${
      filter === 'setting_up'
        ? sql`AND c.status IN ('invited', 'onboarding', 'changes_requested', 'signed')`
        : filter === 'active'
          ? sql`AND c.status = 'active'`
          : filter === 'cancelled'
            ? sql`AND c.status = 'cancelled'`
            : filter === 'needs_action'
              ? sql`AND (c.status = 'signed'
                     OR EXISTS (SELECT 1 FROM ensaar_eor_employees e WHERE e.company_id = c.id AND e.status = 'signed')
                     OR (c.status IN ('onboarding', 'changes_requested') AND EXISTS (
                           SELECT 1 FROM ensaar_eor_company_documents d WHERE d.company_id = c.id AND d.review_status = 'pending')))`
              : sql`AND c.status <> 'cancelled'`
    }
  `;

  const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM ensaar_eor_companies c ${where}`;
  const rows = await sql<(Row & Record<string, number>)[]>`
    SELECT ${sql(COMPANY_COLUMNS.map((c) => `c.${c}`))},
      COALESCE(e.total, 0)::int AS n_total, COALESCE(e.draft, 0)::int AS n_draft,
      COALESCE(e.awaiting, 0)::int AS n_awaiting, COALESCE(e.signed, 0)::int AS n_signed,
      COALESCE(e.onboarding, 0)::int AS n_onboarding, COALESCE(e.active, 0)::int AS n_active,
      COALESCE(e.exited, 0)::int AS n_exited, COALESCE(d.pending, 0)::int AS n_docs_pending
    FROM ensaar_eor_companies c
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status <> 'cancelled') AS total,
             COUNT(*) FILTER (WHERE status = 'draft') AS draft,
             COUNT(*) FILTER (WHERE status = 'awaiting_signature') AS awaiting,
             COUNT(*) FILTER (WHERE status = 'signed') AS signed,
             COUNT(*) FILTER (WHERE status = 'onboarding') AS onboarding,
             COUNT(*) FILTER (WHERE status = 'active') AS active,
             COUNT(*) FILTER (WHERE status = 'exited') AS exited
      FROM ensaar_eor_employees WHERE company_id = c.id
    ) e ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS pending FROM ensaar_eor_company_documents WHERE company_id = c.id AND review_status = 'pending'
    ) d ON TRUE
    ${where}
    ORDER BY (c.status = 'signed' OR COALESCE(e.signed, 0) > 0) DESC, c.created_at DESC, c.id
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  return {
    items: rows.map((r) => ({
      ...toCompany(r),
      counts: {
        total: r.n_total!,
        draft: r.n_draft!,
        awaitingSignature: r.n_awaiting!,
        toCountersign: r.n_signed!,
        onboarding: r.n_onboarding!,
        active: r.n_active!,
        exited: r.n_exited!,
      },
      documentsToReview: r.n_docs_pending!,
    })),
    total,
    page,
    pageSize,
  };
}

export async function employeeCounts(companyId: string): Promise<EmployeeCounts> {
  const [r] = await db()<Record<string, number>[]>`
    SELECT COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS total,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'awaiting_signature')::int AS awaiting,
           COUNT(*) FILTER (WHERE status = 'signed')::int AS signed,
           COUNT(*) FILTER (WHERE status = 'onboarding')::int AS onboarding,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'exited')::int AS exited
    FROM ensaar_eor_employees WHERE company_id = ${companyId}
  `;
  return {
    total: r!.total!,
    draft: r!.draft!,
    awaitingSignature: r!.awaiting!,
    toCountersign: r!.signed!,
    onboarding: r!.onboarding!,
    active: r!.active!,
    exited: r!.exited!,
  };
}

// --- Creating and inviting ----------------------------------------------------------------

export async function findOpenCompanyFor(contactEmail: string, companyName: string): Promise<EorCompany | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${sql(COMPANY_COLUMNS)} FROM ensaar_eor_companies
    WHERE status <> 'cancelled'
      AND (lower(contact_email) = ${contactEmail.toLowerCase()} OR lower(company_name) = ${companyName.toLowerCase()})
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? toCompany(rows[0]) : null;
}

export async function findCompanyByIdempotencyKey(key: string): Promise<EorCompany | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`SELECT ${sql(COMPANY_COLUMNS)} FROM ensaar_eor_companies WHERE idempotency_key = ${key}`;
  return rows[0] ? toCompany(rows[0]) : null;
}

/**
 * Create a client company and invite its first contact to the portal. With
 * `assisted`, Ensaar will enter the details and documents itself: the contact
 * gets access but no "please set up your company" email.
 */
export async function createCompany(
  invite: CompanyInvite,
  invitedBy: string | null,
  idempotencyKey: string | null,
  assisted = false,
): Promise<EorCompany> {
  return requireDatabase().begin(async (tx) => {
    const rows = await tx<Row[]>`
      INSERT INTO ensaar_eor_companies (id, company_name, contact_name, contact_email, notes, invited_by, idempotency_key)
      VALUES (${randomUUID()}, ${invite.companyName}, ${invite.contactName}, ${invite.contactEmail.toLowerCase()},
              ${invite.notes}, ${invitedBy}, ${idempotencyKey})
      RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    const company = toCompany(rows[0]!);
    await ensurePortalUser(tx, {
      companyId: company.id,
      companyName: company.companyName,
      email: company.contactEmail,
      name: company.contactName,
      role: 'contact',
      notify: !assisted,
    });
    return company;
  });
}

/** Staff corrections to the invite details. A new contact email is added and invited; the old one keeps access until removed. */
export async function updateCompanyInvite(id: string, invite: CompanyInvite): Promise<Outcome<EorCompany>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, id);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'cancelled') return refuse(409, 'This client is cancelled.');
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_companies SET company_name = ${invite.companyName}, contact_name = ${invite.contactName},
        contact_email = ${invite.contactEmail.toLowerCase()}, notes = ${invite.notes},
        updated_at = NOW()
      WHERE id = ${id} RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    if (company.contactEmail !== invite.contactEmail.toLowerCase()) {
      await ensurePortalUser(tx, { companyId: id, companyName: displayName(company), email: invite.contactEmail, name: invite.contactName, role: 'contact' });
    }
    return ok(toCompany(rows[0]!));
  });
}

export async function addContact(companyId: string, email: string, name: string | null): Promise<Outcome<true>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'cancelled') return refuse(409, 'This client is cancelled.');
    const { invited } = await ensurePortalUser(tx, { companyId, companyName: displayName(company), email, name, role: 'contact' });
    return invited ? ok(true as const) : refuse(409, 'That person already has access.');
  });
}

// --- Company details and documents: entered by the customer, or by Ensaar for them -----------

/**
 * Save the company details. Naming a signatory gives them portal access (and
 * tells them); only they can sign. Draft schedules already sent are rebuilt so
 * they carry the current legal name.
 *
 * `staff` names the Ensaar person entering the details for the customer. The
 * signatory is then not emailed yet: they are asked to sign once everything is
 * in (sendForSignature). Whoever saved last is who the record says entered them.
 */
export async function saveCompanyDetails(
  companyId: string,
  details: CompanyDetails,
  rebuildSchedules: (tx: Tx, company: EorCompany) => Promise<void>,
  staff: string | null = null,
): Promise<Outcome<EorCompany>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!isCompanyEditable(company.status)) {
      return refuse(
        409,
        staff
          ? 'The agreement is signed, so the details it rests on are closed. Request changes to reopen them (that voids the signature).'
          : 'The agreement is signed, so company details can no longer be changed here. Write to Ensaar.',
      );
    }
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_companies SET company = ${tx.json(details as never)}, details_entered_by = ${staff},
        status = CASE WHEN status = 'invited' THEN 'onboarding' ELSE status END, updated_at = NOW()
      WHERE id = ${companyId} RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    const updated = toCompany(rows[0]!);
    await ensurePortalUser(tx, {
      companyId,
      companyName: details.legalName,
      email: details.signatoryEmail,
      name: details.signatoryName,
      role: 'signatory',
      notify: !staff,
    });
    await rebuildSchedules(tx, updated);
    return ok(updated);
  });
}

export type CompanyDocument = {
  id: string;
  kind: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  reviewStatus: DocumentReview;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  uploadedBy: string | null;
};

type DocRow = {
  id: string;
  kind: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: Date;
  review_status: DocumentReview;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  uploaded_by: string | null;
};

const DOC_COLUMNS = ['id', 'kind', 'filename', 'content_type', 'size_bytes', 'created_at', 'review_status', 'review_note', 'reviewed_by', 'reviewed_at', 'uploaded_by'];

const toDocument = (r: DocRow): CompanyDocument => ({
  id: r.id,
  kind: r.kind,
  filename: r.filename,
  contentType: r.content_type,
  sizeBytes: r.size_bytes,
  createdAt: r.created_at.toISOString(),
  reviewStatus: r.review_status,
  reviewNote: r.review_note,
  reviewedBy: r.reviewed_by,
  reviewedAt: iso(r.reviewed_at),
  uploadedBy: r.uploaded_by,
});

export async function listCompanyDocuments(companyId: string, sql: Executor = db()): Promise<CompanyDocument[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<DocRow[]>`
    SELECT ${sql(DOC_COLUMNS)} FROM ensaar_eor_company_documents WHERE company_id = ${companyId} ORDER BY created_at
  `;
  return rows.map(toDocument);
}

export async function addCompanyDocument(input: {
  companyId: string;
  kind: string;
  filename: string;
  contentType: string;
  data: Buffer;
  uploadedBy: string;
}): Promise<Outcome<CompanyDocument>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, input.companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!isCompanyEditable(company.status)) return refuse(409, 'The agreement is signed, so documents can no longer be changed here.');
    const [{ count }] = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ensaar_eor_company_documents WHERE company_id = ${input.companyId}`;
    if (count >= MAX_DOCUMENTS) return refuse(409, 'That is the most documents a company can hold. Remove one first.');
    const rows = await tx<DocRow[]>`
      INSERT INTO ensaar_eor_company_documents (id, company_id, kind, filename, content_type, size_bytes, sha256, data, uploaded_by)
      VALUES (${randomUUID()}, ${input.companyId}, ${input.kind}, ${input.filename}, ${input.contentType},
              ${input.data.length}, ${sha256(input.data)}, ${input.data}, ${input.uploadedBy})
      RETURNING ${tx(DOC_COLUMNS)}
    `;
    await tx`UPDATE ensaar_eor_companies SET status = 'onboarding', updated_at = NOW() WHERE id = ${input.companyId} AND status = 'invited'`;
    return ok(toDocument(rows[0]!));
  });
}

export async function deleteCompanyDocument(companyId: string, documentId: string): Promise<Outcome<true>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!isCompanyEditable(company.status)) return refuse(409, 'The agreement is signed, so documents can no longer be changed here.');
    const rows = await tx`DELETE FROM ensaar_eor_company_documents WHERE id = ${documentId} AND company_id = ${companyId} RETURNING id`;
    return rows.length ? ok(true as const) : refuse(404, 'No such document.');
  });
}

export async function getCompanyDocumentFile(companyId: string, documentId: string): Promise<{ filename: string; contentType: string; data: Buffer } | null> {
  if (!hasDatabase()) return null;
  const [row] = await db()<{ filename: string; content_type: string; data: Buffer }[]>`
    SELECT filename, content_type, data FROM ensaar_eor_company_documents WHERE id = ${documentId} AND company_id = ${companyId}
  `;
  return row ? { filename: row.filename, contentType: row.content_type, data: row.data } : null;
}

export async function reviewCompanyDocument(
  companyId: string,
  documentId: string,
  decision: DocumentReview,
  note: string | null,
  actor: string,
): Promise<Outcome<CompanyDocument>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'active' || company.status === 'cancelled') return refuse(409, 'The documents of an active or cancelled client are closed.');
    if (decision === 'rejected' && !note?.trim()) return refuse(400, 'Give the customer a reason, so they know what to upload instead.');
    const rows = await tx<DocRow[]>`
      UPDATE ensaar_eor_company_documents SET review_status = ${decision}, review_note = ${note?.trim() || null},
        reviewed_by = ${decision === 'pending' ? null : actor}, reviewed_at = ${decision === 'pending' ? null : new Date()}
      WHERE id = ${documentId} AND company_id = ${companyId}
      RETURNING ${tx(DOC_COLUMNS)}
    `;
    return rows[0] ? ok(toDocument(rows[0])) : refuse(404, 'No such document.');
  });
}

// --- Legal sign-off per agreement version ------------------------------------------------

export type TemplateApproval = { version: string; reviewer: string; note: string | null; recordedBy: string; recordedAt: string };

export async function getTemplateApproval(version = AGREEMENT_VERSION, sql: Executor = db()): Promise<TemplateApproval | null> {
  if (!hasDatabase()) return null;
  const [r] = await sql<{ version: string; reviewer: string; note: string | null; recorded_by: string; recorded_at: Date }[]>`
    SELECT version, reviewer, note, recorded_by, recorded_at FROM ensaar_eor_template_approvals WHERE version = ${version}
  `;
  return r ? { version: r.version, reviewer: r.reviewer, note: r.note, recordedBy: r.recorded_by, recordedAt: r.recorded_at.toISOString() } : null;
}

export async function recordTemplateApproval(input: { reviewer: string; note: string | null; recordedBy: string }): Promise<TemplateApproval> {
  await requireDatabase()`
    INSERT INTO ensaar_eor_template_approvals (version, reviewer, note, recorded_by)
    VALUES (${AGREEMENT_VERSION}, ${input.reviewer}, ${input.note}, ${input.recordedBy})
    ON CONFLICT (version) DO NOTHING
  `;
  return (await getTemplateApproval())!;
}

// --- The master agreement ---------------------------------------------------------------

export function evidenceText(text: string, signer: { name: string | null; title: string | null; email: string | null; at: string | null }, counter: { by: string | null; at: string | null }, hash: string | null, party: string): string {
  return [
    text,
    '',
    'SIGNATURES',
    `For ${party}: ${signer.name}${signer.title ? `, ${signer.title}` : ''} <${signer.email}>, signed electronically ${signer.at} (UTC), signed in to the Ensaar portal as that address`,
    counter.at ? `For Ensaar Global Pvt. Ltd.: ${counter.by}, countersigned electronically ${counter.at} (UTC)` : 'For Ensaar Global Pvt. Ltd.: pending countersignature',
    '',
    `Document fingerprint (SHA-256): ${hash}`,
  ].join('\n');
}

const attachmentName = (company: EorCompany, what: string) =>
  `Ensaar-${what}-${displayName(company).replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}.txt`;

/**
 * Ask the signatory to review and sign, once details and required documents are
 * in. This is how assisted onboarding hands over: Ensaar enters everything, the
 * customer's signatory still signs as themselves. Returns the sign-in link so
 * staff can pass it on directly.
 */
export async function sendForSignature(companyId: string): Promise<Outcome<{ link: string; email: string; name: string }>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!isCompanyEditable(company.status)) return refuse(409, 'The agreement has already been signed.');
    const blockers = signatureBlockers(company.company, await listCompanyDocuments(companyId, tx));
    if (blockers.length || !company.company) return refuse(409, `Still needed before anyone can sign: ${blockers.join(', ')}.`);
    if (!(await getTemplateApproval(AGREEMENT_VERSION, tx))) {
      return refuse(423, 'Customers cannot sign yet: record the legal sign-off for this agreement version first (see Clients).');
    }
    const { signatoryEmail: email, signatoryName: name, legalName } = company.company;
    const link = await requestSignature(tx, { companyId, companyName: legalName, email, name, assisted: Boolean(company.detailsEnteredBy) });
    return ok({ link, email, name });
  });
}

/**
 * The signatory signs the master agreement. Re-checked under the company lock:
 * editable, details saved, required documents present and not rejected, the
 * version legally approved, the signed-in person IS the named signatory, and
 * the text is exactly what they were shown.
 */
export async function signMaster(
  companyId: string,
  shownHash: string,
  signer: { name: string; email: string; ip: string | null; userAgent: string | null },
): Promise<Outcome<EorCompany>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (!isCompanyEditable(company.status)) return refuse(409, 'The agreement has already been signed.');
    const details = company.company;
    if (!details) return refuse(400, 'Complete the company details first.');
    if (details.signatoryEmail.toLowerCase() !== signer.email.toLowerCase()) {
      return refuse(403, `Only ${details.signatoryName} (${details.signatoryEmail}) can sign for ${details.legalName}.`);
    }
    const missing = missingRequiredDocuments(await listCompanyDocuments(companyId, tx));
    if (missing.length) return refuse(400, `Upload these first: ${missing.map((d) => d.label).join(', ')}.`);
    if (!(await getTemplateApproval(AGREEMENT_VERSION, tx))) {
      return refuse(423, 'The agreement is being finalised by our legal team. We will email you as soon as it is ready to sign.');
    }
    const doc = masterDraft(company);
    const text = agreementToText(doc);
    const hash = sha256(text);
    if (hash !== shownHash) return refuse(409, 'The agreement changed since you opened it. Please review it again.', { changed: true });

    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_companies SET status = 'signed', agreement_version = ${doc.version}, agreement_text = ${text},
        agreement_hash = ${hash}, signed_name = ${signer.name}, signed_title = ${details.signatoryTitle},
        signed_email = ${signer.email.toLowerCase()}, signed_at = NOW(), signed_ip = ${signer.ip},
        signed_user_agent = ${signer.userAgent}, changes_note = NULL, updated_at = NOW()
      WHERE id = ${companyId} RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    const signed = toCompany(rows[0]!);
    await enqueue(tx, {
      kind: 'eor.master.signed.staff',
      to: await staffRecipients(tx),
      relatedId: companyId,
      dedupeKey: `eor.master.signed.staff:${companyId}:${hash}`,
      ...masterSignedStaffEmail({ companyName: details.legalName, signer: `${signer.name} (${details.signatoryTitle})`, companyId }),
    });
    await enqueue(tx, {
      kind: 'eor.master.signed.customer',
      to: await companyRecipients(tx, companyId),
      relatedId: companyId,
      dedupeKey: `eor.master.signed.customer:${companyId}:${hash}`,
      attachments: [
        {
          filename: attachmentName(signed, 'Agreement-signed'),
          content: evidenceText(text, { name: signer.name, title: details.signatoryTitle, email: signer.email, at: signed.signedAt }, { by: null, at: null }, hash, details.legalName),
          contentType: 'text/plain',
        },
      ],
      ...masterSignedCustomerEmail({ name: signer.name, companyName: details.legalName }),
    });
    return ok(signed);
  });
}

async function voidMaster(tx: Tx, company: EorCompany, actor: string, reason: string) {
  await tx`
    INSERT INTO ensaar_eor_voided_signatures (id, company_id, kind, agreement_version, agreement_text, agreement_hash,
      signed_name, signed_email, signed_at, signed_ip, voided_by, void_reason)
    SELECT ${randomUUID()}, id, 'master', agreement_version, agreement_text, agreement_hash, signed_name, signed_email,
      signed_at, signed_ip, ${actor}, ${reason}
    FROM ensaar_eor_companies WHERE id = ${company.id}
  `;
  await tx`
    UPDATE ensaar_eor_companies SET agreement_version = NULL, agreement_text = NULL, agreement_hash = NULL, signed_name = NULL,
      signed_title = NULL, signed_email = NULL, signed_at = NULL, signed_ip = NULL, signed_user_agent = NULL
    WHERE id = ${company.id}
  `;
}

/** Send the company back to the customer with a note. A signed master agreement is voided (kept in history). */
export async function requestCompanyChanges(companyId: string, note: string, actor: string): Promise<Outcome<EorCompany>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'active' || company.status === 'cancelled') return refuse(409, 'An active or cancelled client cannot be sent back.');
    const resigned = company.status === 'signed';
    if (resigned) await voidMaster(tx, company, actor, `Changes requested: ${note}`.slice(0, 500));
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_companies SET status = 'changes_requested', changes_note = ${note}, changes_requested_at = NOW(), updated_at = NOW()
      WHERE id = ${companyId} RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    const rejected = (await listCompanyDocuments(companyId, tx))
      .filter((d) => d.reviewStatus === 'rejected')
      .map((d) => ({ label: DOCUMENT_KINDS.find((k) => k.kind === d.kind)?.label ?? d.kind, filename: d.filename, reason: d.reviewNote ?? '' }));
    await enqueue(tx, {
      kind: 'eor.company.changes',
      to: await companyRecipients(tx, companyId),
      relatedId: companyId,
      ...companyChangesEmail({ companyName: displayName(company), note, rejected, resigned }),
    });
    return ok(toCompany(rows[0]!));
  });
}

/** Countersign the master agreement: every required document accepted, a named person signing for Ensaar. */
export async function approveCompany(companyId: string, countersignedBy: string): Promise<Outcome<EorCompany>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status !== 'signed') return refuse(409, 'Only a signed agreement can be countersigned.');
    const documents = await listCompanyDocuments(companyId, tx);
    const missing = missingRequiredDocuments(documents);
    if (missing.length) return refuse(409, `A required document is missing: ${missing.map((d) => d.label).join(', ')}. Request changes instead.`);
    const unaccepted = unacceptedRequiredDocuments(documents);
    if (unaccepted.length) return refuse(409, `Accept each required document first: ${unaccepted.map((d) => d.label).join(', ')}.`);
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_companies SET status = 'active', countersigned_by = ${countersignedBy}, countersigned_at = NOW(), updated_at = NOW()
      WHERE id = ${companyId} RETURNING ${tx(COMPANY_COLUMNS)}
    `;
    const active = toCompany(rows[0]!);
    const [{ agreement_text: stored }] = await tx<{ agreement_text: string }[]>`SELECT agreement_text FROM ensaar_eor_companies WHERE id = ${companyId}`;
    await enqueue(tx, {
      kind: 'eor.company.approved',
      to: await companyRecipients(tx, companyId),
      relatedId: companyId,
      dedupeKey: `eor.company.approved:${companyId}`,
      attachments: [
        {
          filename: attachmentName(active, 'Agreement-executed'),
          content: evidenceText(
            stored,
            { name: active.signedName, title: active.signedTitle, email: active.signedEmail, at: active.signedAt },
            { by: active.countersignedBy, at: active.countersignedAt },
            active.agreementHash,
            displayName(active),
          ),
          contentType: 'text/plain',
        },
      ],
      ...companyApprovedEmail({ companyName: displayName(active) }),
    });
    return ok(active);
  });
}

/** Cancel a client that is not yet active. An active client with employees is offboarded employee by employee. */
export async function cancelCompany(companyId: string): Promise<Outcome<true>> {
  return requireDatabase().begin(async (tx) => {
    const company = await lockCompany(tx, companyId);
    if (!company) return refuse(404, 'No such client.');
    if (company.status === 'cancelled') return refuse(409, 'Already cancelled.');
    const [{ live }] = await tx<{ live: number }[]>`
      SELECT COUNT(*)::int AS live FROM ensaar_eor_employees WHERE company_id = ${companyId} AND status IN ('onboarding', 'active')
    `;
    if (live > 0) return refuse(409, `${live} employee${live === 1 ? ' is' : 's are'} still employed. Exit them first.`);
    await tx`UPDATE ensaar_eor_companies SET status = 'cancelled', updated_at = NOW() WHERE id = ${companyId}`;
    await tx`UPDATE ensaar_eor_employees SET status = 'cancelled', updated_at = NOW() WHERE company_id = ${companyId} AND status IN ('draft', 'awaiting_signature', 'signed')`;
    await tx`DELETE FROM ensaar_portal_sessions WHERE user_id IN (SELECT id FROM ensaar_portal_users WHERE company_id = ${companyId})`;
    return ok(true as const);
  });
}

export type VoidedSignature = {
  id: string;
  kind: 'master' | 'schedule';
  employeeId: string | null;
  agreementVersion: string | null;
  agreementHash: string | null;
  signedName: string | null;
  signedAt: string | null;
  voidedAt: string;
  voidedBy: string | null;
  voidReason: string | null;
};

export async function listVoidedSignatures(companyId: string, employeeId?: string): Promise<VoidedSignature[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<
    { id: string; kind: 'master' | 'schedule'; employee_id: string | null; agreement_version: string | null; agreement_hash: string | null; signed_name: string | null; signed_at: Date | null; voided_at: Date; voided_by: string | null; void_reason: string | null }[]
  >`
    SELECT id, kind, employee_id, agreement_version, agreement_hash, signed_name, signed_at, voided_at, voided_by, void_reason
    FROM ensaar_eor_voided_signatures
    WHERE company_id = ${companyId} ${employeeId ? db()`AND employee_id = ${employeeId}` : db()``}
    ORDER BY voided_at DESC LIMIT 100
  `;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    employeeId: r.employee_id,
    agreementVersion: r.agreement_version,
    agreementHash: r.agreement_hash,
    signedName: r.signed_name,
    signedAt: iso(r.signed_at),
    voidedAt: r.voided_at.toISOString(),
    voidedBy: r.voided_by,
    voidReason: r.void_reason,
  }));
}
