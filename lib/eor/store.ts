import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { agreementToText, buildAgreement, type AgreementDocument } from './agreement';
import {
  ONBOARDING_TTL_DAYS,
  type ClientStatus,
  type CompanyDetails,
  type HireInput,
} from './onboarding';

export type EorDocument = {
  id: string;
  kind: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
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
  signedAt: string | null;
  signedIp: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
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
  signed_at: Date | null;
  signed_ip: string | null;
  countersigned_by: string | null;
  countersigned_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// Never agreement_text or signed_user_agent: the list view has no use for them.
const COLUMNS = [
  'id', 'status', 'token_expires_at', 'company_name', 'contact_name', 'contact_email', 'employee_name',
  'employee_email', 'job_title', 'salary_inr', 'start_date', 'work_state', 'monthly_fee_usd', 'notes',
  'company', 'agreement_version', 'agreement_hash', 'signed_name', 'signed_title', 'signed_at',
  'signed_ip', 'countersigned_by', 'countersigned_at', 'created_at', 'updated_at',
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
    signedAt: iso(row.signed_at),
    signedIp: row.signed_ip,
    countersignedBy: row.countersigned_by,
    countersignedAt: iso(row.countersigned_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken() {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ONBOARDING_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash: hashToken(token), expiresAt };
}

export async function listClients(): Promise<EorClient[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients ORDER BY created_at DESC LIMIT 500
  `;
  return rows.map(toClient);
}

export async function getClient(id: string): Promise<EorClient | null> {
  if (!hasDatabase()) return null;
  const sql = db();
  const rows = await sql<Row[]>`
    SELECT ${sql(COLUMNS)} FROM ensaar_eor_clients WHERE id = ${id} LIMIT 1
  `;
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
    WHERE token_hash = ${hashToken(token)} AND token_expires_at > NOW() AND status <> 'cancelled'
    LIMIT 1
  `;
  return rows[0] ? toClient(rows[0]) : null;
}

/** Start an onboarding, returning the raw portal token exactly once. */
export async function createClient(
  hire: HireInput,
  invitedBy: string | null,
): Promise<{ client: EorClient; token: string }> {
  const sql = requireDatabase();
  const { token, hash, expiresAt } = newToken();
  const rows = await sql<Row[]>`
    INSERT INTO ensaar_eor_clients (
      id, token_hash, token_expires_at, company_name, contact_name, contact_email, employee_name,
      employee_email, job_title, salary_inr, start_date, work_state, monthly_fee_usd, notes, invited_by
    ) VALUES (
      ${randomUUID()}, ${hash}, ${expiresAt}, ${hire.companyName}, ${hire.contactName}, ${hire.contactEmail},
      ${hire.employeeName}, ${hire.employeeEmail}, ${hire.jobTitle}, ${hire.salaryInr}, ${hire.startDate},
      ${hire.workState}, ${hire.monthlyFeeUsd}, ${hire.notes}, ${invitedBy}
    )
    RETURNING ${sql(COLUMNS)}
  `;
  return { client: toClient(rows[0]!), token };
}

/** Issue a fresh link. The previous one stops working immediately. */
export async function reissueToken(id: string): Promise<string | null> {
  const { token, hash, expiresAt } = newToken();
  const rows = await requireDatabase()`
    UPDATE ensaar_eor_clients SET token_hash = ${hash}, token_expires_at = ${expiresAt}, updated_at = NOW()
    WHERE id = ${id} AND status <> 'cancelled'
    RETURNING id
  `;
  return rows.length ? token : null;
}

/** Save the customer's company answers. Only before signing. */
export async function saveCompany(id: string, company: CompanyDetails): Promise<boolean> {
  const sql = requireDatabase();
  const rows = await sql`
    UPDATE ensaar_eor_clients
    SET company = ${sql.json(company as never)}, status = 'in_progress', updated_at = NOW()
    WHERE id = ${id} AND status IN ('invited', 'in_progress')
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listDocuments(clientId: string): Promise<EorDocument[]> {
  if (!hasDatabase()) return [];
  const rows = await db()<
    { id: string; kind: string; filename: string; content_type: string; size_bytes: number; created_at: Date }[]
  >`
    SELECT id, kind, filename, content_type, size_bytes, created_at
    FROM ensaar_eor_documents WHERE client_id = ${clientId} ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    filename: r.filename,
    contentType: r.content_type,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function addDocument(input: {
  clientId: string;
  kind: string;
  filename: string;
  contentType: string;
  data: Buffer;
}): Promise<EorDocument> {
  const sql = requireDatabase();
  const id = randomUUID();
  const sha256 = createHash('sha256').update(input.data).digest('hex');
  await sql`
    INSERT INTO ensaar_eor_documents (id, client_id, kind, filename, content_type, size_bytes, sha256, data)
    VALUES (${id}, ${input.clientId}, ${input.kind}, ${input.filename}, ${input.contentType},
            ${input.data.length}, ${sha256}, ${input.data})
  `;
  await sql`
    UPDATE ensaar_eor_clients SET status = 'in_progress', updated_at = NOW()
    WHERE id = ${input.clientId} AND status = 'invited'
  `;
  return {
    id,
    kind: input.kind,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.data.length,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteDocument(clientId: string, documentId: string): Promise<boolean> {
  const rows = await requireDatabase()`
    DELETE FROM ensaar_eor_documents WHERE id = ${documentId} AND client_id = ${clientId} RETURNING id
  `;
  return rows.length > 0;
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

/** The agreement as it stands: the signed snapshot once signed, otherwise the live draft. */
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

/**
 * Record the customer's signature over the exact text they were shown.
 *
 * `shownHash` is the hash of the draft the page displayed. If the text built now
 * differs (a template change deployed mid-session), nothing is signed and the
 * customer is asked to review again, so nobody signs text they did not see.
 *
 * The UPDATE is conditional on the record still being editable AND on the
 * company details being exactly the ones this text was built from, so an edit
 * made in another tab between reading and signing cannot leave the stored text
 * and the stored company disagreeing. At most one signature can ever land.
 */
export async function signAgreement(
  client: EorClient,
  shownHash: string,
  evidence: { name: string; title: string; network: string | null; userAgent: string | null },
): Promise<EorClient | 'changed' | null> {
  if (!client.company) return null;
  const doc = currentAgreement(client);
  const text = agreementToText(doc);
  const hash = createHash('sha256').update(text).digest('hex');
  if (hash !== shownHash) return 'changed';

  const sql = requireDatabase();
  const rows = await sql<Row[]>`
    UPDATE ensaar_eor_clients SET
      status = 'signed',
      agreement_version = ${doc.version},
      agreement_text = ${text},
      agreement_hash = ${hash},
      signed_name = ${evidence.name},
      signed_title = ${evidence.title},
      signed_at = NOW(),
      signed_ip = ${evidence.network},
      signed_user_agent = ${evidence.userAgent},
      updated_at = NOW()
    WHERE id = ${client.id}
      AND status IN ('invited', 'in_progress')
      AND company = ${sql.json(client.company as never)}
    RETURNING ${sql(COLUMNS)}
  `;
  return rows[0] ? toClient(rows[0]) : null;
}

/** Ensaar's review and countersignature. */
export async function approveClient(id: string, countersignedBy: string): Promise<boolean> {
  const rows = await requireDatabase()`
    UPDATE ensaar_eor_clients SET status = 'approved', countersigned_by = ${countersignedBy},
      countersigned_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND status = 'signed'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function cancelClient(id: string): Promise<boolean> {
  const rows = await requireDatabase()`
    UPDATE ensaar_eor_clients SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id} AND status <> 'approved' AND status <> 'cancelled'
    RETURNING id
  `;
  return rows.length > 0;
}
