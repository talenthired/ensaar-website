import 'server-only';

import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue } from '@/lib/notify/outbox';
import { displayName, getCompany, listCompanyDocuments, type EorCompany } from './companies';
import { companyOutstandingEmail, employeeOutstandingEmail } from './email';
import { employeeOutstandingFor } from './employee-records';
import { getEmployee, type EorEmployee } from './employees';
import { knownAs } from './onboarding';
import { CLIENT_REMINDER, EMPLOYEE_REMINDER, companyOutstanding, reminderSlot, zonedNow, type OutstandingList } from './outstanding';
import { getOwnership } from './ownership-store';
import { companyRecipients } from './portal-auth';

/*
 * Reminders for what a client or an employee still owes Ensaar. Sent once when
 * the ask is first made (the agreement goes to the signatory; the employee gets
 * their documents), then every Monday and Thursday until nothing is left.
 * Each send has a dedupe key per local date, so a restart, a second instance or
 * a send-now on a reminder day never sends twice that day.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

/*
 * Nobody is reminded before Ensaar has deliberately contacted them: a client
 * only once it has been invited to the portal or asked to sign (an assisted
 * client has a portal account it was never told about); an employee only once
 * invited to the employee portal, which happens when their first document is
 * issued. Entering someone in Basecamp, or directly in the database, sends nothing.
 */
const CLIENT_CONTACTED = (sql: Executor, companyId: string) =>
  sql`SELECT 1 FROM ensaar_outbox WHERE related_id = ${companyId} AND kind IN ('portal.invite', 'portal.sign_request') LIMIT 1`;
const EMPLOYEE_INVITED = (sql: Executor, employeeId: string) =>
  sql`SELECT 1 FROM ensaar_team_login_tokens WHERE employee_id = ${employeeId} AND purpose = 'invite' LIMIT 1`;

/** Employees who are, or are about to be, employed: the ones Ensaar is collecting details from. */
const REMINDED_EMPLOYEE_STATUSES = ['awaiting_signature', 'signed', 'onboarding', 'active'];

export async function companyOutstandingFor(company: EorCompany, sql: Executor = db()): Promise<OutstandingList> {
  const [documents, ownership] = await Promise.all([listCompanyDocuments(company.id, sql), getOwnership(company.id, sql)]);
  return companyOutstanding({ details: company.company, documents, ownershipDeclared: Boolean(ownership) });
}

async function queueCompany(tx: Executor, company: EorCompany, date: string, scheduled = false): Promise<boolean> {
  if (company.status === 'cancelled' || !company.company) return false;
  if ((await CLIENT_CONTACTED(tx, company.id)).length === 0) return false;
  const list = await companyOutstandingFor(company, tx);
  if (list.needed.length === 0) return false;
  const to = await companyRecipients(tx, company.id);
  if (to.length === 0) return false;
  await enqueue(tx, {
    // Scheduled ones are sent after everything else in the outbox; the one that goes with the agreement is not.
    kind: scheduled ? 'eor.outstanding.scheduled.company' : 'eor.outstanding.company',
    to,
    relatedId: company.id,
    dedupeKey: `outstanding:company:${company.id}:${date}`,
    ...companyOutstandingEmail({ name: company.company.signatoryName, companyName: displayName(company), received: list.received, needed: list.needed }),
  });
  return true;
}

async function queueEmployee(tx: Executor, employee: EorEmployee, date: string, scheduled = false): Promise<boolean> {
  if (!employee.employeeEmail || !REMINDED_EMPLOYEE_STATUSES.includes(employee.status)) return false;
  if ((await EMPLOYEE_INVITED(tx, employee.id)).length === 0) return false;
  const list = await employeeOutstandingFor(employee, tx);
  if (list.needed.length === 0) return false;
  await enqueue(tx, {
    kind: scheduled ? 'eor.outstanding.scheduled.employee' : 'eor.outstanding.employee',
    to: [employee.employeeEmail],
    relatedId: employee.id,
    dedupeKey: `outstanding:employee:${employee.id}:${date}`,
    ...employeeOutstandingEmail({ name: knownAs(employee), received: list.received, needed: list.needed }),
  });
  return true;
}

/** Remind a client now (once a day at most), when the agreement goes out for signature. */
export async function remindCompanyNow(companyId: string, now = new Date()): Promise<boolean> {
  const company = await getCompany(companyId);
  if (!company) return false;
  return requireDatabase().begin((tx) => queueCompany(tx, company, zonedNow(now, CLIENT_REMINDER.timeZone).date));
}

/** Remind an employee now (once a day at most), when their documents or invitation go out. */
export async function remindEmployeeNow(employeeId: string, now = new Date()): Promise<boolean> {
  const employee = await getEmployee(employeeId);
  if (!employee) return false;
  return requireDatabase().begin((tx) => queueEmployee(tx, employee, zonedNow(now, EMPLOYEE_REMINDER.timeZone).date));
}

/** The scheduled pass: on Mondays and Thursdays, after the morning hour in each side's time zone. */
export async function runOutstandingReminders(now = new Date()): Promise<{ companies: number; employees: number }> {
  if (!hasDatabase()) return { companies: 0, employees: 0 };
  const sql = db();
  let companies = 0;
  let employees = 0;

  const clientDate = reminderSlot(now, CLIENT_REMINDER);
  if (clientDate) {
    const ids = await sql<{ id: string }[]>`
      SELECT c.id FROM ensaar_eor_companies c
      WHERE c.status <> 'cancelled' AND c.company IS NOT NULL
        AND EXISTS (SELECT 1 FROM ensaar_outbox o WHERE o.related_id = c.id AND o.kind IN ('portal.invite', 'portal.sign_request'))
        AND NOT EXISTS (SELECT 1 FROM ensaar_outbox o WHERE o.dedupe_key = 'outstanding:company:' || c.id || ':' || ${clientDate})
      LIMIT 500
    `;
    for (const { id } of ids) {
      const company = await getCompany(id);
      if (company && (await sql.begin((tx) => queueCompany(tx, company, clientDate, true)))) companies++;
    }
  }

  const employeeDate = reminderSlot(now, EMPLOYEE_REMINDER);
  if (employeeDate) {
    const ids = await sql<{ id: string }[]>`
      SELECT e.id FROM ensaar_eor_employees e JOIN ensaar_eor_companies c ON c.id = e.company_id
      WHERE e.status = ANY(${REMINDED_EMPLOYEE_STATUSES}) AND e.employee_email IS NOT NULL AND c.status <> 'cancelled'
        AND EXISTS (SELECT 1 FROM ensaar_team_login_tokens t WHERE t.employee_id = e.id AND t.purpose = 'invite')
        AND NOT EXISTS (SELECT 1 FROM ensaar_outbox o WHERE o.dedupe_key = 'outstanding:employee:' || e.id || ':' || ${employeeDate})
      LIMIT 2000
    `;
    for (const { id } of ids) {
      const employee = await getEmployee(id);
      if (employee && (await sql.begin((tx) => queueEmployee(tx, employee, employeeDate, true)))) employees++;
    }
  }
  return { companies, employees };
}
