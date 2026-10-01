import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import type { EorEmployee } from './employees';
import { ok, refuse, type Outcome } from './outcome';
import { employeeOutstanding, type OutstandingList } from './outstanding';

/*
 * What an employee gives Ensaar so they can be paid: the salary bank account,
 * proof of it, and a relieving letter from their last employer (or that they
 * had none). Entered in the employee portal; seen in full by Ensaar staff only.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

export const EMPLOYEE_FILE_KINDS = {
  bank_proof: 'Proof of bank account',
  relieving_letter: 'Relieving letter',
} as const;
export type EmployeeFileKind = keyof typeof EMPLOYEE_FILE_KINDS;
export const isEmployeeFileKind = (value: unknown): value is EmployeeFileKind => typeof value === 'string' && value in EMPLOYEE_FILE_KINDS;

export type BankAccount = { holderName: string; accountNumber: string; ifsc: string; updatedAt: string };
export type EmployeeFile = { id: string; kind: EmployeeFileKind; filename: string; contentType: string; sizeBytes: number; uploadedBy: string | null; uploadedAt: string };

/** Check and normalise a bank account. Indian account numbers are 9 to 18 digits; an IFSC is 4 letters, 0, then 6 letters or digits. */
export function validateBank(input: unknown): { ok: true; value: Omit<BankAccount, 'updatedAt'> } | { ok: false; errors: Record<string, string> } {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const holderName = typeof body.holderName === 'string' ? body.holderName.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.replace(/[\s-]/g, '') : '';
  const ifsc = typeof body.ifsc === 'string' ? body.ifsc.trim().toUpperCase() : '';
  const errors: Record<string, string> = {};
  if (holderName.length < 3) errors.holderName = 'Enter the name on the account, as the bank has it.';
  if (!/^\d{9,18}$/.test(accountNumber)) errors.accountNumber = 'Enter the account number: 9 to 18 digits.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) errors.ifsc = 'Enter the 11-character IFSC, for example ICIC0000183.';
  if (typeof body.confirmAccountNumber === 'string' && body.confirmAccountNumber.replace(/[\s-]/g, '') !== accountNumber) {
    errors.confirmAccountNumber = 'The two account numbers do not match.';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { holderName, accountNumber, ifsc } };
}

/** The last four digits only, for anywhere the full number is not needed. */
export const maskAccount = (n: string) => `•••• ${n.slice(-4)}`;

export async function getBank(employeeId: string, sql: Executor = db()): Promise<BankAccount | null> {
  if (!hasDatabase()) return null;
  const [r] = await sql<{ holder_name: string; account_number: string; ifsc: string; updated_at: Date }[]>`
    SELECT holder_name, account_number, ifsc, updated_at FROM ensaar_employee_bank WHERE employee_id = ${employeeId}
  `;
  return r ? { holderName: r.holder_name, accountNumber: r.account_number, ifsc: r.ifsc, updatedAt: r.updated_at.toISOString() } : null;
}

export async function saveBank(employeeId: string, bank: Omit<BankAccount, 'updatedAt'>): Promise<BankAccount> {
  const sql = requireDatabase();
  await sql`
    INSERT INTO ensaar_employee_bank (employee_id, holder_name, account_number, ifsc) VALUES (${employeeId}, ${bank.holderName}, ${bank.accountNumber}, ${bank.ifsc})
    ON CONFLICT (employee_id) DO UPDATE SET holder_name = EXCLUDED.holder_name, account_number = EXCLUDED.account_number, ifsc = EXCLUDED.ifsc, updated_at = NOW()
  `;
  return (await getBank(employeeId))!;
}

type FileRow = { id: string; kind: EmployeeFileKind; filename: string; content_type: string; size_bytes: number; uploaded_by: string | null; uploaded_at: Date };
const toFile = (r: FileRow): EmployeeFile => ({ id: r.id, kind: r.kind, filename: r.filename, contentType: r.content_type, sizeBytes: r.size_bytes, uploadedBy: r.uploaded_by, uploadedAt: r.uploaded_at.toISOString() });

export async function listEmployeeFiles(employeeId: string, sql: Executor = db()): Promise<EmployeeFile[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<FileRow[]>`
    SELECT id, kind, filename, content_type, size_bytes, uploaded_by, uploaded_at FROM ensaar_employee_files WHERE employee_id = ${employeeId} ORDER BY uploaded_at
  `;
  return rows.map(toFile);
}

/** One file with its bytes. Pass employeeId to make sure it is theirs. */
export async function getEmployeeFile(id: string, employeeId?: string): Promise<(EmployeeFile & { employeeId: string; content: Buffer }) | null> {
  const sql = db();
  const [r] = await sql<(FileRow & { employee_id: string; content: Buffer })[]>`
    SELECT id, employee_id, kind, filename, content_type, size_bytes, uploaded_by, uploaded_at, content FROM ensaar_employee_files
    WHERE id = ${id} ${employeeId ? sql`AND employee_id = ${employeeId}` : sql``}
  `;
  return r ? { ...toFile(r), employeeId: r.employee_id, content: r.content } : null;
}

/** At most this many files of one kind per employee, so an upload loop cannot fill the database. */
const MAX_FILES_PER_KIND = 5;

export async function addEmployeeFile(
  employeeId: string,
  upload: { kind: EmployeeFileKind; filename: string; contentType: string; data: Buffer },
  uploadedBy: string,
): Promise<Outcome<EmployeeFile>> {
  return requireDatabase().begin(async (tx) => {
    const [{ n }] = await tx<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ensaar_employee_files WHERE employee_id = ${employeeId} AND kind = ${upload.kind}`;
    if (n >= MAX_FILES_PER_KIND) return refuse(409, `You have already uploaded ${MAX_FILES_PER_KIND} files of this kind. Remove one first.`);
    const rows = await tx<FileRow[]>`
      INSERT INTO ensaar_employee_files (id, employee_id, kind, filename, content_type, size_bytes, content, uploaded_by)
      VALUES (${randomUUID()}, ${employeeId}, ${upload.kind}, ${upload.filename}, ${upload.contentType}, ${upload.data.length}, ${upload.data}, ${uploadedBy})
      RETURNING id, kind, filename, content_type, size_bytes, uploaded_by, uploaded_at
    `;
    return ok(toFile(rows[0]!));
  });
}

export async function removeEmployeeFile(id: string, employeeId: string): Promise<boolean> {
  const rows = await requireDatabase()`DELETE FROM ensaar_employee_files WHERE id = ${id} AND employee_id = ${employeeId} RETURNING id`;
  return rows.length > 0;
}

export async function setNoPreviousEmployer(employeeId: string, none: boolean): Promise<void> {
  await requireDatabase()`UPDATE ensaar_eor_employees SET no_previous_employer = ${none}, updated_at = NOW() WHERE id = ${employeeId}`;
}

/** What this employee still owes Ensaar, from what is stored. */
export async function employeeOutstandingFor(employee: Pick<EorEmployee, 'id' | 'employeeName' | 'employeeCase'>, sql: Executor = db()): Promise<OutstandingList> {
  const [bank, files, flag] = await Promise.all([
    getBank(employee.id, sql),
    listEmployeeFiles(employee.id, sql),
    sql<{ no_previous_employer: boolean }[]>`SELECT no_previous_employer FROM ensaar_eor_employees WHERE id = ${employee.id}`,
  ]);
  return employeeOutstanding({
    legalName: employee.employeeName,
    hasBankDetails: Boolean(bank),
    hasBankProof: files.some((f) => f.kind === 'bank_proof'),
    hasRelievingLetter: files.some((f) => f.kind === 'relieving_letter'),
    noPreviousEmployer: Boolean(flag[0]?.no_previous_employer),
    identityVerified: Boolean(employee.employeeCase?.steps.identity),
  });
}

/**
 * Everything about an employee's records in one view. Staff see the full
 * account number; the employee sees the last four digits of their own.
 */
export async function employeeRecordsView(employee: Pick<EorEmployee, 'id' | 'employeeName' | 'employeeCase'>, audience: 'staff' | 'employee') {
  const sql = db();
  const [bank, files, flag, outstanding] = await Promise.all([
    getBank(employee.id, sql),
    listEmployeeFiles(employee.id, sql),
    sql<{ no_previous_employer: boolean }[]>`SELECT no_previous_employer FROM ensaar_eor_employees WHERE id = ${employee.id}`,
    employeeOutstandingFor(employee, sql),
  ]);
  return {
    bank: bank && { ...bank, accountNumber: audience === 'staff' ? bank.accountNumber : maskAccount(bank.accountNumber) },
    files: files.map((f) => ({ ...f, uploadedBy: audience === 'staff' ? f.uploadedBy : null })),
    noPreviousEmployer: Boolean(flag[0]?.no_previous_employer),
    outstanding,
  };
}

export type EmployeeRecordsView = Awaited<ReturnType<typeof employeeRecordsView>>;
