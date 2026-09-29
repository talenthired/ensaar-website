import 'server-only';

import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { AGREEMENT_VERSION, agreementToText, buildAgreement, type AgreementDocument } from './agreement';
import {
  approvedEmail,
  changesRequestedEmail,
  inviteEmail,
  linkEmail,
  onboardingLink,
  signatureReceivedEmail,
  signedConfirmationEmail,
  verifyCodeEmail,
} from './email';
import {
  DOCUMENT_KINDS,
  EMPLOYEE_STEPS,
  MAX_DOCUMENTS,
  ONBOARDING_TTL_DAYS,
  POST_SIGN_ACCESS_DAYS,
  VERIFY_CODE_TTL_MINUTES,
  VERIFY_MAX_ATTEMPTS,
  isEditable,
  missingRequiredDocuments,
  todayInIndia,
  unacceptedRequiredDocuments,
  type ClientStatus,
  type CompanyDetails,
  type DocumentReview,
  type EmployeeCase,
  type HireInput,
} from './onboarding';

/*
 * Every change to an onboarding runs in a transaction that first locks the
 * client row (SELECT ... FOR UPDATE). Uploads, deletions, company saves,
 * signing, reviews and approval therefore take turns per client, and each
 * re-checks the state it depends on after acquiring the lock. That is what
 * closes the race the 2026-09-29 audit reproduced (EOR-02), where a document
 * deleted during signing left a signed record missing a required document.
 */

type Tx = postgres.TransactionSql;

export type EorDocument = {
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
};

export type EorClient = HireInput & {
  id: string;
  status: ClientStatus;
  tokenExpiresAt: string;
  company: CompanyDetails | null;
  agreementVersion: string | null;
  agreementHash: string | null;
  signedName: string | null;
  signedTitle: string | null;
  signedEmail: string | null;
  signedVerification: string | null;
  signedAt: string | null;
  signedIp: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
  changesNote: string | null;
  changesRequestedAt: string | null;
  signatoryVerifiedEmail: string | null;
  signatoryVerifiedAt: string | null;
  signatoryVerifiedBy: string | null;
  employeeCase: EmployeeCase | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  status: string;
  token_expires_at: Date;
  company_name: string;
  contact_name: string;
  contact_email: string;
  employee_name: string;
  employee_email: string | null;
  job_title: string;
  salary_inr: string | number;
  start_date: string;
  work_state: string;
  monthly_fee_usd: number;
  notes: string | null;
  company: CompanyDetails | null;
  agreement_version: string | null;
  agreement_hash: string | null;
  signed_name: string | null;
  signed_title: string | null;
  signed_email: string | null;
  signed_verification: string | null;
  signed_at: Date | null;
  signed_ip: string | null;
  countersigned_by: string | null;
  countersigned_at: Date | null;
  changes_note: string | null;
  changes_requested_at: Date | null;
  signatory_verified_email: string | null;
  signatory_verified_at: Date | null;
  signatory_verified_by: string | null;
  employee_case: EmployeeCase | null;
  created_at: Date;
  updated_at: Date;
};

// Never agreement_text, signed_user_agent or verification secrets.
const COLUMNS = [
  'id', 'status', 'token_expires_at', 'company_name', 'contact_name', 'contact_email', 'employee_name',
  'employee_email', 'job_title', 'salary_inr', 'start_date', 'work_state', 'monthly_fee_usd', 'notes',
  'company', 'agreement_version', 'agreement_hash', 'signed_name', 'signed_title', 'signed_email',
  'signed_verification', 'signed_at', 'signed_ip', 'countersigned_by', 'countersigned_at', 'changes_note',
  'changes_requested_at', 'signatory_verified_email', 'signatory_verified_at', 'signatory_verified_by',
  'employee_case', 'created_at', 'updated_at',
];

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toClient(row: Row): EorClient {
  return {
    id: row.id,
    status: row.status as ClientStatus,
    tokenExpiresAt: row.token_expires_at.toISOString(),
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    jobTitle: row.job_title,
    // BIGINT comes back as a string from postgres.js.
    salaryInr: Number(row.salary_inr),
    startDate: row.start_date,
    workState: row.work_state,
    monthlyFeeUsd: row.monthly_fee_usd,
    notes: row.notes,
    company: row.company,
    agreementVersion: row.agreement_version,
    agreementHash: row.agreement_hash,
    signedName: row.signed_name,
    signedTitle: row.signed_title,
    signedEmail: row.signed_email,
    signedVerification: row.signed_verification,
    signedAt: iso(row.signed_at),
    signedIp: row.signed_ip,
    countersignedBy: row.countersigned_by,
    countersignedAt: iso(row.countersigned_at),
    changesNote: row.changes_note,
    changesRequestedAt: iso(row.changes_requested_at),
    signatoryVerifiedEmail: row.signatory_verified_email,
    signatoryVerifiedAt: iso(row.signatory_verified_at),
    signatoryVerifiedBy: row.signatory_verified_by,
    employeeCase: row.employee_case,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

function newToken() {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ONBOARDING_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash: sha256(token), expiresAt };
}

/** Lock the client row for the rest of the transaction. */
async function lockClient(tx: Tx, id: string): Promise<EorClient | null> {
  const rows = await tx<Row[]>`SELECT ${tx(COLUMNS)} FROM ensaar_eor_clients WHERE id = ${id} FOR UPDATE`;
  return rows[0] ? toClient(rows[0]) : null;
}

// --- Reading ----------------------------------------------------------------------

export type ClientListFilter = {
  q?: string;
  status?: ClientStatus | 'needs_action' | 'all';
  cursor?: string | null;
  limit?: number;
};

/**
 * A page of onboardings, newest first, with search and filters (GAP-05).
 * The cursor is "<created_at ISO>|<id>", so pages are stable while new rows arrive.
 */
export async function listClients(filter: ClientListFilter = {}): Promise<{ clients: EorClient[]; nextCursor: string | null }> {
  if (!hasDatabase()) return { clients: [], nextCursor: null };
  const sql = db();
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
  const q = filter.q?.trim().slice(0, 100);
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const [cursorAt, cursorId] = filter.cursor?.split('|') ?? [];
  const cursorDate = cursorAt && !Number.isNaN(Date.parse(cursorAt)) ? new Date(cursorAt) : null;
  const status = filter.status && filter.status !== 'all' ? filter.status : null;
  const today = todayInIndia();

  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients
    WHERE TRUE
      ${like ? sql`AND (company_name ILIKE ${like} OR employee_name ILIKE ${like} OR contact_email ILIKE ${like} OR contact_name ILIKE ${like} OR company->>'legalName' ILIKE ${like})` : sql``}
      ${
        status === 'needs_action'
          ? sql`AND (
              status = 'signed'
              OR (status IN ('invited', 'in_progress', 'changes_requested') AND token_expires_at < NOW() + INTERVAL '5 days')
              OR (status NOT IN ('approved', 'cancelled') AND start_date < ${today})
              OR (status = 'approved' AND employee_case IS NOT NULL AND EXISTS (
                    SELECT 1 FROM jsonb_each(employee_case->'steps') s WHERE s.value = 'null'::jsonb)
                  AND start_date <= ${today}))`
          : status
            ? sql`AND status = ${status}`
            : sql``
      }
      ${cursorDate ? sql`AND (created_at, id) < (${cursorDate}, ${cursorId ?? ''})` : sql``}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit + 1}
  `;
  const page = rows.slice(0, limit).map(toClient);
  const last = page[page.length - 1];
  return { clients: page, nextCursor: rows.length > limit && last ? `${last.createdAt}|${last.id}` : null };
}

export async function getClient(id: string): Promise<EorClient | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients WHERE id = ${id} LIMIT 1`;
  return rows[0] ? toClient(rows[0]) : null;
}

/**
 * The client a portal link refers to, while the link is live. A cancelled
 * onboarding stops resolving, so a revoked link shows the same thing as a wrong one.
 */
export async function getClientByToken(token: string): Promise<EorClient | null> {
  if (!hasDatabase() || !token) return null;
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients
    WHERE token_hash = ${sha256(token)} AND token_expires_at > NOW() AND status <> 'cancelled'
    LIMIT 1
  `;
  return rows[0] ? toClient(rows[0]) : null;
}

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
};

function toDocument(r: DocRow): EorDocument {
  return {
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
  };
}

export async function listDocuments(clientId: string, sql: postgres.Sql | Tx = db()): Promise<EorDocument[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<DocRow[]>`
    SELECT id, kind, filename, content_type, size_bytes, created_at, review_status, review_note, reviewed_by, reviewed_at
    FROM ensaar_eor_documents WHERE client_id = ${clientId} ORDER BY created_at ASC
  `;
  return rows.map(toDocument);
}

export async function getDocumentFile(
  clientId: string,
  documentId: string,
): Promise<{ filename: string; contentType: string; data: Buffer } | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<{ filename: string; content_type: string; data: Buffer }[]>`
    SELECT filename, content_type, data FROM ensaar_eor_documents
    WHERE id = ${documentId} AND client_id = ${clientId} LIMIT 1
  `;
  const row = rows[0];
  return row ? { filename: row.filename, contentType: row.content_type, data: row.data } : null;
}

/** The agreement built from the record as it stands now. */
export function currentAgreement(client: EorClient): AgreementDocument {
  return buildAgreement(client, client.company);
}

export async function getSignedAgreementText(id: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<{ agreement_text: string | null }[]>`
    SELECT agreement_text FROM ensaar_eor_clients WHERE id = ${id} LIMIT 1
  `;
  return rows[0]?.agreement_text ?? null;
}

export type VoidedSignature = {
  id: string;
  agreementVersion: string | null;
  agreementHash: string | null;
  signedName: string | null;
  signedAt: string | null;
  voidedAt: string;
  voidedBy: string | null;
  voidReason: string | null;
};

export async function listSignatureHistory(clientId: string): Promise<VoidedSignature[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<
    { id: string; agreement_version: string | null; agreement_hash: string | null; signed_name: string | null; signed_at: Date | null; voided_at: Date; voided_by: string | null; void_reason: string | null }[]
  >`
    SELECT id, agreement_version, agreement_hash, signed_name, signed_at, voided_at, voided_by, void_reason
    FROM ensaar_eor_signature_history WHERE client_id = ${clientId} ORDER BY voided_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    agreementVersion: r.agreement_version,
    agreementHash: r.agreement_hash,
    signedName: r.signed_name,
    signedAt: iso(r.signed_at),
    voidedAt: r.voided_at.toISOString(),
    voidedBy: r.voided_by,
    voidReason: r.void_reason,
  }));
}

// --- Legal sign-off per agreement version (GAP-06) ---------------------------------

export type TemplateApproval = { version: string; reviewer: string; note: string | null; recordedBy: string; recordedAt: string };

export async function getTemplateApproval(version = AGREEMENT_VERSION, sql: postgres.Sql | Tx = db()): Promise<TemplateApproval | null> {
  if (!hasDatabase()) return null;
  const rows = await sql<{ version: string; reviewer: string; note: string | null; recorded_by: string; recorded_at: Date }[]>`
    SELECT version, reviewer, note, recorded_by, recorded_at FROM ensaar_eor_template_approvals WHERE version = ${version}
  `;
  const r = rows[0];
  return r ? { version: r.version, reviewer: r.reviewer, note: r.note, recordedBy: r.recorded_by, recordedAt: r.recorded_at.toISOString() } : null;
}

export async function recordTemplateApproval(input: { reviewer: string; note: string | null; recordedBy: string }): Promise<TemplateApproval> {
  const sql = requireDatabase();
  await sql`
    INSERT INTO ensaar_eor_template_approvals (version, reviewer, note, recorded_by)
    VALUES (${AGREEMENT_VERSION}, ${input.reviewer}, ${input.note}, ${input.recordedBy})
    ON CONFLICT (version) DO NOTHING
  `;
  return (await getTemplateApproval())!;
}

// --- Invitations --------------------------------------------------------------------

export async function findByIdempotencyKey(key: string): Promise<EorClient | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients WHERE idempotency_key = ${key} LIMIT 1`;
  return rows[0] ? toClient(rows[0]) : null;
}

/** An open onboarding for the same contact and employee, to warn before a duplicate (EOR-10). */
export async function findOpenDuplicate(hire: HireInput): Promise<EorClient | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients
    WHERE lower(contact_email) = ${hire.contactEmail.toLowerCase()}
      AND lower(employee_name) = ${hire.employeeName.toLowerCase()}
      AND status NOT IN ('cancelled')
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? toClient(rows[0]) : null;
}

/**
 * Start an onboarding and queue the invitation, returning the raw token exactly once.
 *
 * `idempotencyKey` comes from the admin's form. A retry of the same submission
 * (a double click, an uncertain network response) finds the existing row and
 * returns it without a token or a second email.
 */
export async function createClient(
  hire: HireInput,
  invitedBy: string | null,
  idempotencyKey: string | null,
): Promise<{ client: EorClient; token: string | null; replayed: boolean }> {
  const sql = requireDatabase();
  if (idempotencyKey) {
    const existing = await sql<Row[]>`SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients WHERE idempotency_key = ${idempotencyKey}`;
    if (existing[0]) return { client: toClient(existing[0]), token: null, replayed: true };
  }
  const { token, hash, expiresAt } = newToken();
  try {
    const client = await sql.begin(async (tx) => {
      const rows = await tx<Row[]>`
        INSERT INTO ensaar_eor_clients (
          id, token_hash, token_expires_at, company_name, contact_name, contact_email, employee_name,
          employee_email, job_title, salary_inr, start_date, work_state, monthly_fee_usd, notes, invited_by,
          idempotency_key
        ) VALUES (
          ${randomUUID()}, ${hash}, ${expiresAt}, ${hire.companyName}, ${hire.contactName}, ${hire.contactEmail},
          ${hire.employeeName}, ${hire.employeeEmail}, ${hire.jobTitle}, ${hire.salaryInr}, ${hire.startDate},
          ${hire.workState}, ${hire.monthlyFeeUsd}, ${hire.notes}, ${invitedBy}, ${idempotencyKey}
        )
        RETURNING ${tx(COLUMNS)}
      `;
      const created = toClient(rows[0]!);
      await enqueue(tx, {
        kind: 'eor.invite',
        to: [created.contactEmail],
        relatedId: created.id,
        dedupeKey: `eor.invite:${created.id}`,
        ...inviteEmail({ contactName: created.contactName, employeeName: created.employeeName, link: onboardingLink(token) }),
      });
      return created;
    });
    return { client, token, replayed: false };
  } catch (error) {
    // Two identical submissions raced past the lookup: the unique index let one win.
    if (idempotencyKey && error instanceof Error && /idempotency/.test(error.message)) {
      const existing = await sql<Row[]>`SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients WHERE idempotency_key = ${idempotencyKey}`;
      if (existing[0]) return { client: toClient(existing[0]), token: null, replayed: true };
    }
    throw error;
  }
}

/** Issue a fresh link and email it. The previous one stops working immediately. */
export async function reissueToken(id: string, reason: string): Promise<string | null> {
  const { token, hash, expiresAt } = newToken();
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client || client.status === 'cancelled') return null;
    await tx`
      UPDATE ensaar_eor_clients SET token_hash = ${hash}, token_expires_at = ${expiresAt}, updated_at = NOW()
      WHERE id = ${id}
    `;
    await enqueue(tx, {
      kind: 'eor.link',
      to: [client.contactEmail],
      relatedId: id,
      ...linkEmail({ contactName: client.contactName, employeeName: client.employeeName, link: onboardingLink(token), reason }),
    });
    return token;
  });
}

/**
 * Email a fresh link to someone who proves they own the address (EOR-07).
 * Matches the contact or the declared signatory of any live onboarding. The
 * caller always answers the same way, so this cannot confirm who is a customer.
 */
export async function recoverLinks(email: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const address = email.trim().toLowerCase();
  const rows = await db()<{ id: string }[]>`
    SELECT id FROM ensaar_eor_clients
    WHERE status <> 'cancelled'
      AND (lower(contact_email) = ${address} OR lower(company->>'signatoryEmail') = ${address})
    ORDER BY created_at DESC LIMIT 5
  `;
  for (const row of rows) {
    const { token, hash, expiresAt } = newToken();
    await db().begin(async (tx) => {
      const client = await lockClient(tx, row.id);
      if (!client || client.status === 'cancelled') return;
      await tx`UPDATE ensaar_eor_clients SET token_hash = ${hash}, token_expires_at = ${expiresAt}, updated_at = NOW() WHERE id = ${row.id}`;
      await enqueue(tx, {
        kind: 'eor.link',
        // Only to the address that asked, which is one we already hold for this onboarding.
        to: [address],
        relatedId: row.id,
        ...linkEmail({
          contactName: client.contactEmail === address ? client.contactName : client.company?.signatoryName ?? client.contactName,
          employeeName: client.employeeName,
          link: onboardingLink(token),
          reason: 'You asked for a new link to your Ensaar onboarding.',
        }),
      });
    });
  }
  return rows.length;
}

// --- Customer changes -----------------------------------------------------------------

export type Refusal = { ok: false; status: number; error: string; changed?: boolean };
export type Outcome<T = EorClient> = { ok: true; value: T } | Refusal;
const refuse = (status: number, error: string, extra: Partial<Refusal> = {}): Refusal => ({ ok: false, status, error, ...extra });

/** Save the customer's company answers. Only while editable. */
export async function saveCompany(id: string, company: CompanyDetails): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!isEditable(client.status)) return refuse(409, 'This onboarding is already signed and can no longer be changed.');
    // A new signatory must verify again: verification is of a person, not of the form.
    const keepVerification =
      client.signatoryVerifiedEmail && client.signatoryVerifiedEmail.toLowerCase() === company.signatoryEmail.toLowerCase();
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET
        company = ${tx.json(company as never)},
        status = CASE WHEN status = 'invited' THEN 'in_progress' ELSE status END,
        signatory_verified_email = ${keepVerification ? client.signatoryVerifiedEmail : null},
        signatory_verified_at = ${keepVerification ? client.signatoryVerifiedAt : null},
        signatory_verified_by = ${keepVerification ? client.signatoryVerifiedBy : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING ${tx(COLUMNS)}
    `;
    return { ok: true, value: toClient(rows[0]!) };
  });
}

export async function addDocument(input: {
  clientId: string;
  kind: string;
  filename: string;
  contentType: string;
  data: Buffer;
}): Promise<Outcome<EorDocument>> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, input.clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!isEditable(client.status)) return refuse(409, 'This onboarding is already signed.');
    const [{ count }] = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ensaar_eor_documents WHERE client_id = ${input.clientId}`;
    if (count >= MAX_DOCUMENTS) return refuse(409, 'That is the most documents one onboarding can hold. Remove one first.');
    const rows = await tx<DocRow[]>`
      INSERT INTO ensaar_eor_documents (id, client_id, kind, filename, content_type, size_bytes, sha256, data)
      VALUES (${randomUUID()}, ${input.clientId}, ${input.kind}, ${input.filename}, ${input.contentType},
              ${input.data.length}, ${sha256(input.data)}, ${input.data})
      RETURNING id, kind, filename, content_type, size_bytes, created_at, review_status, review_note, reviewed_by, reviewed_at
    `;
    await tx`UPDATE ensaar_eor_clients SET status = 'in_progress', updated_at = NOW() WHERE id = ${input.clientId} AND status = 'invited'`;
    return { ok: true, value: toDocument(rows[0]!) };
  });
}

export async function deleteDocument(clientId: string, documentId: string): Promise<Outcome<true>> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!isEditable(client.status)) return refuse(409, 'This onboarding is already signed.');
    const rows = await tx`DELETE FROM ensaar_eor_documents WHERE id = ${documentId} AND client_id = ${clientId} RETURNING id`;
    return rows.length ? { ok: true, value: true as const } : refuse(404, 'No such document.');
  });
}

// --- Signatory verification (GAP-03) -------------------------------------------------

const codeHash = (clientId: string, code: string) => sha256(`${clientId}:${code}`);

/** Email a one-time code to the declared signatory. */
export async function startVerification(clientId: string): Promise<Outcome<{ sentTo: string }>> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!isEditable(client.status)) return refuse(409, 'This onboarding is already signed.');
    if (!client.company) return refuse(400, 'Complete your company details first.');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await tx`
      UPDATE ensaar_eor_clients SET verify_code_hash = ${codeHash(clientId, code)},
        verify_code_expires_at = NOW() + make_interval(mins => ${VERIFY_CODE_TTL_MINUTES}), verify_attempts = 0
      WHERE id = ${clientId}
    `;
    await enqueue(tx, {
      kind: 'eor.verify',
      to: [client.company.signatoryEmail],
      relatedId: clientId,
      ...verifyCodeEmail({ signatoryName: client.company.signatoryName, companyName: client.company.legalName, code }),
    });
    return { ok: true, value: { sentTo: client.company.signatoryEmail } };
  });
}

export async function checkVerification(clientId: string, code: string): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client?.company) return refuse(404, 'No such onboarding.');
    const [secret] = await tx<{ verify_code_hash: string | null; verify_code_expires_at: Date | null; verify_attempts: number }[]>`
      SELECT verify_code_hash, verify_code_expires_at, verify_attempts FROM ensaar_eor_clients WHERE id = ${clientId}
    `;
    if (!secret?.verify_code_hash || !secret.verify_code_expires_at || secret.verify_code_expires_at.getTime() < Date.now()) {
      return refuse(400, 'That code has expired. Send a new one.');
    }
    if (secret.verify_attempts >= VERIFY_MAX_ATTEMPTS) return refuse(429, 'Too many attempts. Send a new code.');
    const expected = Buffer.from(secret.verify_code_hash, 'hex');
    const given = Buffer.from(codeHash(clientId, code.replace(/\D/g, '').slice(0, 6)), 'hex');
    if (!timingSafeEqual(expected, given)) {
      await tx`UPDATE ensaar_eor_clients SET verify_attempts = verify_attempts + 1 WHERE id = ${clientId}`;
      return refuse(400, 'That code is not right. Check the email and try again.');
    }
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET signatory_verified_email = ${client.company.signatoryEmail},
        signatory_verified_at = NOW(), signatory_verified_by = 'email_code',
        verify_code_hash = NULL, verify_code_expires_at = NULL, verify_attempts = 0, updated_at = NOW()
      WHERE id = ${clientId}
      RETURNING ${tx(COLUMNS)}
    `;
    return { ok: true, value: toClient(rows[0]!) };
  });
}

/** Staff vouch for the signatory (a call, a known contact) when email verification is not possible. */
export async function attestSignatory(clientId: string, actor: string, note: string): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!client.company) return refuse(400, 'The customer has not named a signatory yet.');
    if (!isEditable(client.status)) return refuse(409, 'This onboarding is already signed.');
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET signatory_verified_email = ${client.company.signatoryEmail},
        signatory_verified_at = NOW(), signatory_verified_by = ${`staff_attested: ${actor}: ${note}`.slice(0, 500)}, updated_at = NOW()
      WHERE id = ${clientId}
      RETURNING ${tx(COLUMNS)}
    `;
    return { ok: true, value: toClient(rows[0]!) };
  });
}

// --- Signing --------------------------------------------------------------------------

/**
 * Record the customer's signature over the exact text they were shown.
 *
 * Under the client lock, re-checks everything signing depends on: still
 * editable, company saved, every required document present and not rejected,
 * the agreement version legally approved, the named signatory verified, and the
 * text hashing to what the page displayed. The signature, its evidence and both
 * notifications commit together or not at all.
 */
export async function signAgreement(
  clientId: string,
  shownHash: string,
  evidence: { name: string; network: string | null; userAgent: string | null },
): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (!isEditable(client.status)) return refuse(409, 'This agreement has already been signed.');
    if (!client.company) return refuse(400, 'Complete your company details first.');
    const documents = await listDocuments(clientId, tx);
    const missing = missingRequiredDocuments(documents);
    if (missing.length) return refuse(400, `Upload these first: ${missing.map((d) => d.label).join(', ')}.`);
    if (!(await getTemplateApproval(AGREEMENT_VERSION, tx))) {
      return refuse(423, 'The agreement is being finalised by our legal team. We will email you as soon as it is ready to sign.');
    }
    const company = client.company;
    if (client.signatoryVerifiedEmail?.toLowerCase() !== company.signatoryEmail.toLowerCase()) {
      return refuse(403, `Verify the signatory first: we email a code to ${company.signatoryEmail}.`);
    }

    const doc = currentAgreement(client);
    const text = agreementToText(doc);
    const hash = sha256(text);
    if (hash !== shownHash) {
      return refuse(409, 'The agreement changed since you opened it. Please review the updated version and sign again.', { changed: true });
    }

    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET
        status = 'signed',
        agreement_version = ${doc.version},
        agreement_text = ${text},
        agreement_hash = ${hash},
        signed_name = ${evidence.name},
        signed_title = ${company.signatoryTitle},
        signed_email = ${company.signatoryEmail},
        signed_verification = ${client.signatoryVerifiedBy},
        signed_at = NOW(),
        signed_ip = ${evidence.network},
        signed_user_agent = ${evidence.userAgent},
        changes_note = NULL,
        -- Keep the link alive long enough to collect the countersigned copy (EOR-07).
        token_expires_at = GREATEST(token_expires_at, NOW() + make_interval(days => ${POST_SIGN_ACCESS_DAYS})),
        updated_at = NOW()
      WHERE id = ${clientId}
      RETURNING ${tx(COLUMNS)}
    `;
    const signed = toClient(rows[0]!);
    const attachment = { filename: attachmentName(signed, 'signed'), content: evidenceText(text, signed), contentType: 'text/plain' };

    await enqueue(tx, {
      kind: 'eor.signed.staff',
      to: await staffRecipients(tx),
      relatedId: clientId,
      dedupeKey: `eor.signed.staff:${clientId}:${hash}`,
      ...signatureReceivedEmail({ companyName: company.legalName, employeeName: signed.employeeName, signer: `${evidence.name} (${company.signatoryTitle})`, clientId }),
    });
    await enqueue(tx, {
      kind: 'eor.signed.customer',
      to: [company.signatoryEmail, signed.contactEmail],
      relatedId: clientId,
      dedupeKey: `eor.signed.customer:${clientId}:${hash}`,
      attachments: [attachment],
      ...signedConfirmationEmail({ name: evidence.name, companyName: company.legalName, employeeName: signed.employeeName }),
    });
    return { ok: true, value: signed };
  });
}

function attachmentName(client: EorClient, stage: 'signed' | 'executed') {
  const company = (client.company?.legalName ?? client.companyName).replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
  return `Ensaar-EOR-Agreement-${company}-${stage}.txt`;
}

/** The signed text plus the evidence that makes it attributable. */
function evidenceText(text: string, client: EorClient): string {
  return [
    text,
    '',
    'SIGNATURES',
    `For ${client.company?.legalName ?? client.companyName}: ${client.signedName}, ${client.signedTitle} <${client.signedEmail}>`,
    `  signed electronically ${client.signedAt} (UTC); signatory verified by ${client.signedVerification?.startsWith('staff_attested') ? 'Ensaar staff' : 'email code'}`,
    client.countersignedAt
      ? `For Ensaar Global Pvt. Ltd.: ${client.countersignedBy}, countersigned electronically ${client.countersignedAt} (UTC)`
      : 'For Ensaar Global Pvt. Ltd.: pending countersignature',
    '',
    `Document fingerprint (SHA-256): ${client.agreementHash}`,
  ].join('\n');
}

// --- Staff actions -------------------------------------------------------------------

/** Move a live signature to history. It is never overwritten or deleted. */
async function voidSignature(tx: Tx, client: EorClient, actor: string, reason: string) {
  await tx`
    INSERT INTO ensaar_eor_signature_history (id, client_id, agreement_version, agreement_text, agreement_hash,
      signed_name, signed_title, signed_email, signed_at, signed_ip, voided_by, void_reason)
    SELECT ${randomUUID()}, id, agreement_version, agreement_text, agreement_hash, signed_name, signed_title,
      signed_email, signed_at, signed_ip, ${actor}, ${reason}
    FROM ensaar_eor_clients WHERE id = ${client.id}
  `;
  await tx`
    UPDATE ensaar_eor_clients SET agreement_version = NULL, agreement_text = NULL, agreement_hash = NULL,
      signed_name = NULL, signed_title = NULL, signed_email = NULL, signed_verification = NULL, signed_at = NULL,
      signed_ip = NULL, signed_user_agent = NULL
    WHERE id = ${client.id}
  `;
}

/**
 * Correct the hire details (GAP-01). Allowed until approval. If the customer
 * already signed, that signature is voided and kept in history, and they are
 * asked to review and sign the revised agreement.
 */
export async function updateHire(id: string, hire: HireInput, actor: string): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client) return refuse(404, 'No such onboarding.');
    if (client.status === 'approved' || client.status === 'cancelled') {
      return refuse(409, 'An approved or cancelled onboarding cannot be changed. Start a new one.');
    }
    const resign = client.status === 'signed';
    if (resign) await voidSignature(tx, client, actor, 'Hire details changed by Ensaar');
    const note = resign ? 'We updated the hire details. Please review the revised agreement and sign it again.' : client.changesNote;
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET company_name = ${hire.companyName}, contact_name = ${hire.contactName},
        contact_email = ${hire.contactEmail}, employee_name = ${hire.employeeName}, employee_email = ${hire.employeeEmail},
        job_title = ${hire.jobTitle}, salary_inr = ${hire.salaryInr}, start_date = ${hire.startDate},
        work_state = ${hire.workState}, monthly_fee_usd = ${hire.monthlyFeeUsd}, notes = ${hire.notes},
        status = ${resign ? 'changes_requested' : client.status},
        changes_note = ${note}, changes_requested_at = ${resign ? new Date() : client.changesRequestedAt ? new Date(client.changesRequestedAt) : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING ${tx(COLUMNS)}
    `;
    const updated = toClient(rows[0]!);
    if (resign) {
      await enqueue(tx, {
        kind: 'eor.changes',
        to: [updated.contactEmail, ...(updated.company ? [updated.company.signatoryEmail] : [])],
        relatedId: id,
        ...changesRequestedEmail({ contactName: updated.contactName, employeeName: updated.employeeName, note: note!, rejected: [], resigned: true }),
      });
    }
    return { ok: true, value: updated };
  });
}

/** Accept or reject one document, with a reason the customer will see. */
export async function reviewDocument(
  clientId: string,
  documentId: string,
  decision: 'accepted' | 'rejected' | 'pending',
  note: string | null,
  actor: string,
): Promise<Outcome<EorDocument>> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, clientId);
    if (!client) return refuse(404, 'No such onboarding.');
    if (client.status === 'approved' || client.status === 'cancelled') return refuse(409, 'This onboarding is closed.');
    if (decision === 'rejected' && !note?.trim()) return refuse(400, 'Give the customer a reason, so they know what to upload instead.');
    const rows = await tx<DocRow[]>`
      UPDATE ensaar_eor_documents SET review_status = ${decision}, review_note = ${note?.trim() || null},
        reviewed_by = ${decision === 'pending' ? null : actor}, reviewed_at = ${decision === 'pending' ? null : new Date()}
      WHERE id = ${documentId} AND client_id = ${clientId}
      RETURNING id, kind, filename, content_type, size_bytes, created_at, review_status, review_note, reviewed_by, reviewed_at
    `;
    return rows[0] ? { ok: true, value: toDocument(rows[0]) } : refuse(404, 'No such document.');
  });
}

/**
 * Send the onboarding back to the customer with a note (GAP-01). Rejected
 * documents are listed in the email. A signed agreement is voided (kept in
 * history), because the customer will be changing what it rests on.
 */
export async function requestChanges(id: string, note: string, actor: string): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client) return refuse(404, 'No such onboarding.');
    if (client.status === 'approved' || client.status === 'cancelled') return refuse(409, 'This onboarding is closed.');
    const resign = client.status === 'signed';
    if (resign) await voidSignature(tx, client, actor, `Changes requested: ${note}`.slice(0, 500));
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET status = 'changes_requested', changes_note = ${note}, changes_requested_at = NOW(),
        -- A customer asked to fix something needs a working link to do it.
        token_expires_at = GREATEST(token_expires_at, NOW() + make_interval(days => ${ONBOARDING_TTL_DAYS})),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING ${tx(COLUMNS)}
    `;
    const updated = toClient(rows[0]!);
    const rejected = (await listDocuments(id, tx))
      .filter((d) => d.reviewStatus === 'rejected')
      .map((d) => ({ label: DOCUMENT_KINDS.find((k) => k.kind === d.kind)?.label ?? d.kind, filename: d.filename, reason: d.reviewNote ?? '' }));
    await enqueue(tx, {
      kind: 'eor.changes',
      to: [updated.contactEmail, ...(updated.company ? [updated.company.signatoryEmail] : [])],
      relatedId: id,
      ...changesRequestedEmail({ contactName: updated.contactName, employeeName: updated.employeeName, note, rejected, resigned: resign }),
    });
    return { ok: true, value: updated };
  });
}

/**
 * Ensaar's review and countersignature.
 *
 * Checked independently of how the record got to "signed": every required
 * document must be present AND accepted by staff, the start date must not have
 * passed unless staff explicitly confirm it (EOR-08), and the countersigner must
 * be a named person. Approval opens the employee onboarding checklist (GAP-04)
 * and emails the executed agreement to the customer.
 */
export async function approveClient(
  id: string,
  countersignedBy: string,
  options: { confirmPastStart?: boolean } = {},
): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client) return refuse(404, 'No such onboarding.');
    if (client.status !== 'signed') return refuse(409, 'Only a signed onboarding can be approved.');
    const documents = await listDocuments(id, tx);
    const missing = missingRequiredDocuments(documents);
    if (missing.length) return refuse(409, `A required document is missing: ${missing.map((d) => d.label).join(', ')}. Request changes instead.`);
    const unaccepted = unacceptedRequiredDocuments(documents);
    if (unaccepted.length) return refuse(409, `Accept each required document first: ${unaccepted.map((d) => d.label).join(', ')}.`);
    if (client.startDate < todayInIndia() && !options.confirmPastStart) {
      return refuse(409, 'The start date has passed. Change the start date (the customer will re-sign), or confirm a backdated start.');
    }

    const employeeCase: EmployeeCase = {
      owner: countersignedBy,
      dueDate: client.startDate,
      steps: Object.fromEntries(EMPLOYEE_STEPS.map((s) => [s.key, null])),
    };
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET status = 'approved', countersigned_by = ${countersignedBy},
        countersigned_at = NOW(), employee_case = ${tx.json(employeeCase as never)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING ${tx(COLUMNS)}
    `;
    const approved = toClient(rows[0]!);
    const [{ agreement_text: text }] = await tx<{ agreement_text: string }[]>`SELECT agreement_text FROM ensaar_eor_clients WHERE id = ${id}`;
    await enqueue(tx, {
      kind: 'eor.approved',
      to: [approved.contactEmail, ...(approved.company ? [approved.company.signatoryEmail] : [])],
      relatedId: id,
      dedupeKey: `eor.approved:${id}`,
      attachments: [{ filename: attachmentName(approved, 'executed'), content: evidenceText(text, approved), contentType: 'text/plain' }],
      ...approvedEmail({
        name: approved.company?.signatoryName ?? approved.contactName,
        companyName: approved.company?.legalName ?? approved.companyName,
        employeeName: approved.employeeName,
        startDate: approved.startDate,
      }),
    });
    return { ok: true, value: approved };
  });
}

export async function cancelClient(id: string): Promise<boolean> {
  const rows = await requireDatabase()`
    UPDATE ensaar_eor_clients SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id} AND status <> 'approved' AND status <> 'cancelled'
    RETURNING id
  `;
  return rows.length > 0;
}

/** Tick or untick an employee onboarding step, or change its owner. */
export async function updateEmployeeCase(
  id: string,
  change: { step?: string; done?: boolean; owner?: string },
  actor: string,
): Promise<Outcome> {
  return requireDatabase().begin(async (tx) => {
    const client = await lockClient(tx, id);
    if (!client) return refuse(404, 'No such onboarding.');
    if (client.status !== 'approved' || !client.employeeCase) return refuse(409, 'Employee onboarding starts after approval.');
    const next: EmployeeCase = { ...client.employeeCase, steps: { ...client.employeeCase.steps } };
    if (change.step) {
      if (!EMPLOYEE_STEPS.some((s) => s.key === change.step)) return refuse(400, 'Unknown step.');
      next.steps[change.step] = change.done ? { doneAt: new Date().toISOString(), doneBy: actor } : null;
    }
    if (typeof change.owner === 'string') next.owner = change.owner.trim().slice(0, 200) || null;
    const rows = await tx<Row[]>`
      UPDATE ensaar_eor_clients SET employee_case = ${tx.json(next as never)}, updated_at = NOW()
      WHERE id = ${id} RETURNING ${tx(COLUMNS)}
    `;
    return { ok: true, value: toClient(rows[0]!) };
  });
}
