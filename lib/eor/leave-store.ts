import 'server-only';

import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { db, hasDatabase, requireDatabase } from '@/lib/db/client';
import { enqueue, staffRecipients } from '@/lib/notify/outbox';
import { leaveDecidedEmail, leaveRecordedEmail, leaveRequestedEmail, leaveStaleStaffEmail } from './email';
import type { EorEmployee } from './employees';
import { PROBATION_MONTHS } from './agreement';
import {
  LEAVE_TYPES,
  autoApproved,
  checkLeaveRequest,
  encashableDays,
  ptoBalance,
  unpaidDaysInMonth,
  type LeaveStatus,
  type LeaveType,
} from './leave';
import { knownAs, todayInIndia } from './onboarding';
import { ok, refuse, type Outcome } from './outcome';
import { companyRecipients } from './portal-auth';
import { holidayView } from './team';

/*
 * Leave in use: the employee asks (or records sickness), the client approves
 * planned leave in its portal, Ensaar sees everything and can decide instead.
 * The rules are in ./leave (pure); this file stores and notifies.
 */

type Executor = postgres.Sql | postgres.TransactionSql;

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  halfStart: boolean;
  halfEnd: boolean;
  days: number;
  paidDays: number;
  unpaidDays: number;
  reason: string | null;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAs: 'client' | 'ensaar' | 'auto' | null;
  decidedAt: string | null;
  note: string | null;
  createdAt: string;
};

type Row = {
  id: string; employee_id: string; type: LeaveType; from_day: Date; to_day: Date; half_start: boolean; half_end: boolean;
  days: string; paid_days: string; unpaid_days: string; reason: string | null; status: LeaveStatus;
  decided_by: string | null; decided_as: LeaveRequest['decidedAs']; decided_at: Date | null; note: string | null; created_at: Date;
};
const COLUMNS = ['id', 'employee_id', 'type', 'from_day', 'to_day', 'half_start', 'half_end', 'days', 'paid_days', 'unpaid_days', 'reason', 'status', 'decided_by', 'decided_as', 'decided_at', 'note', 'created_at'];
const day = (d: Date) => d.toISOString().slice(0, 10);
const toRequest = (r: Row): LeaveRequest => ({
  id: r.id, employeeId: r.employee_id, type: r.type, from: day(r.from_day), to: day(r.to_day), halfStart: r.half_start, halfEnd: r.half_end,
  days: Number(r.days), paidDays: Number(r.paid_days), unpaidDays: Number(r.unpaid_days), reason: r.reason, status: r.status,
  decidedBy: r.decided_by, decidedAs: r.decided_as, decidedAt: r.decided_at?.toISOString() ?? null, note: r.note, createdAt: r.created_at.toISOString(),
});

/** The client's approved holidays for a year: days off that are not leave. */
async function holidaysFor(companyId: string, year: number): Promise<Set<string>> {
  const view = await holidayView(companyId, year);
  return new Set(view.plan.status === 'approved' ? view.chosen.map((h) => h.date) : []);
}

export async function listLeave(employeeId: string, sql: Executor = db()): Promise<LeaveRequest[]> {
  if (!hasDatabase()) return [];
  const rows = await sql<Row[]>`SELECT ${sql(COLUMNS)} FROM ensaar_leave_requests WHERE employee_id = ${employeeId} ORDER BY from_day DESC LIMIT 200`;
  return rows.map(toRequest);
}

async function adjustmentsFor(employeeId: string, sql: Executor) {
  const rows = await sql<{ id: string; year: number; days: string; reason: string; created_by: string; created_at: Date }[]>`
    SELECT id, year, days, reason, created_by, created_at FROM ensaar_leave_adjustments WHERE employee_id = ${employeeId} ORDER BY created_at DESC
  `;
  return rows.map((r) => ({ id: r.id, year: r.year, days: Number(r.days), reason: r.reason, createdBy: r.created_by, createdAt: r.created_at.toISOString() }));
}

const addMonths = (d: string, months: number) => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1 + months, dd)).toISOString().slice(0, 10);
};

/** An employee's leave for a year: balance, requests, adjustments, and what would be encashed. */
export async function leaveSummary(employee: Pick<EorEmployee, 'id' | 'startDate'>, year: number, sql: Executor = db()) {
  const [requests, adjustments] = hasDatabase() ? await Promise.all([listLeave(employee.id, sql), adjustmentsFor(employee.id, sql)]) : [[], []];
  const balance = ptoBalance({ startDate: employee.startDate, year, requests, adjustments });
  const probationEnds = addMonths(employee.startDate, PROBATION_MONTHS);
  return {
    year,
    balance,
    encashable: encashableDays({ left: balance.left, probationEnds, year }),
    probationEnds,
    requests,
    adjustments,
    paternityUsed: requests.filter((r) => r.type === 'paternity' && (r.status === 'approved' || r.status === 'pending')).reduce((n, r) => n + r.days, 0),
  };
}

/** The employee asks for leave, or records sickness. Planned leave goes to the client to approve. */
export async function requestLeave(
  employee: EorEmployee,
  input: { type: unknown; from: unknown; to: unknown; halfStart?: unknown; halfEnd?: unknown; reason?: unknown },
): Promise<Outcome<LeaveRequest>> {
  if (typeof input.type !== 'string' || !(input.type in LEAVE_TYPES)) return refuse(400, 'Choose the kind of leave.');
  const type = input.type as LeaveType;
  const from = String(input.from ?? '');
  const to = String(input.to ?? '');
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) || null : null;
  return requireDatabase().begin(async (tx) => {
    // One request at a time per employee, so two cannot both spend the same balance.
    await tx`SELECT id FROM ensaar_eor_employees WHERE id = ${employee.id} FOR UPDATE`;
    const year = Number(from.slice(0, 4)) || Number(todayInIndia().slice(0, 4));
    const summary = await leaveSummary(employee, year, tx);
    const overlap = summary.requests.some((r) => (r.status === 'pending' || r.status === 'approved') && r.from <= to && r.to >= from);
    if (overlap) return refuse(409, 'You already have leave on some of those days.');
    const check = checkLeaveRequest({
      type, from, to,
      halfStart: input.halfStart === true,
      halfEnd: input.halfEnd === true,
      startDate: employee.startDate,
      today: todayInIndia(),
      holidays: await holidaysFor(employee.companyId, year),
      ptoLeft: summary.balance.left,
      paternityUsed: summary.paternityUsed,
    });
    if (!check.ok) return refuse(400, check.error);
    const auto = autoApproved(type);
    const [row] = await tx<Row[]>`
      INSERT INTO ensaar_leave_requests (id, employee_id, type, from_day, to_day, half_start, half_end, days, paid_days, unpaid_days, reason, status, decided_as, decided_at)
      VALUES (${randomUUID()}, ${employee.id}, ${type}, ${from}, ${to}, ${input.halfStart === true}, ${input.halfEnd === true}, ${check.days}, ${check.paidDays}, ${check.unpaidDays},
              ${reason}, ${auto ? 'approved' : 'pending'}, ${auto ? 'auto' : null}, ${auto ? new Date() : null})
      RETURNING ${tx(COLUMNS)}
    `;
    const request = toRequest(row!);
    const mail = { employeeName: knownAs(employee), typeLabel: LEAVE_TYPES[type], from, to, days: check.days };
    const to_ = await companyRecipients(tx, employee.companyId);
    await enqueue(tx, auto
      ? { kind: 'portal.leave.recorded', to: to_, relatedId: employee.companyId, dedupeKey: `portal.leave.recorded:${request.id}`, ...leaveRecordedEmail(mail) }
      : { kind: 'portal.leave.requested', to: to_, relatedId: employee.companyId, dedupeKey: `portal.leave.requested:${request.id}`, ...leaveRequestedEmail({ ...mail, reason }) });
    return ok(request);
  });
}

/** The employee withdraws a request, or cancels approved leave that has not started. */
export async function cancelLeave(employee: Pick<EorEmployee, 'id'>, id: string): Promise<Outcome<LeaveRequest>> {
  const rows = await requireDatabase()<Row[]>`
    UPDATE ensaar_leave_requests SET status = 'cancelled'
    WHERE id = ${id} AND employee_id = ${employee.id} AND (status = 'pending' OR (status = 'approved' AND from_day > ${todayInIndia()}))
    RETURNING ${requireDatabase()(COLUMNS)}
  `;
  return rows[0] ? ok(toRequest(rows[0])) : refuse(409, 'That leave has already started or been decided. Ask HR to change it.');
}

/**
 * The client (scoped to its own employees) or Ensaar approves or declines.
 * Ensaar can also decline leave the client approved, or approve what it declined.
 */
export async function decideLeave(
  id: string,
  input: { approve: boolean; note: unknown; by: string; as: 'client' | 'ensaar'; companyId?: string },
): Promise<Outcome<LeaveRequest>> {
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null;
  if (!input.approve && !note) return refuse(400, 'Say why, so the employee understands.');
  return requireDatabase().begin(async (tx) => {
    const [found] = await tx<(Row & { company_id: string; employee_name: string; business_name: string | null; employee_email: string | null })[]>`
      SELECT r.*, e.company_id, e.employee_name, e.business_name, e.employee_email FROM ensaar_leave_requests r
      JOIN ensaar_eor_employees e ON e.id = r.employee_id WHERE r.id = ${id} FOR UPDATE OF r
    `;
    if (!found || (input.companyId && found.company_id !== input.companyId)) return refuse(404, 'No such leave request.');
    if (input.as === 'client' && found.status !== 'pending') return refuse(409, 'This request has already been decided.');
    if (found.status === 'cancelled') return refuse(409, 'The employee cancelled this request.');
    if (found.type === 'sick' && !input.approve) return refuse(409, 'Sick leave is recorded, not approved. Talk to HR if something is wrong.');
    const [row] = await tx<Row[]>`
      UPDATE ensaar_leave_requests SET status = ${input.approve ? 'approved' : 'declined'}, decided_by = ${input.by}, decided_as = ${input.as}, decided_at = NOW(), note = ${note}
      WHERE id = ${id} RETURNING ${tx(COLUMNS)}
    `;
    const request = toRequest(row!);
    if (found.employee_email) {
      await enqueue(tx, {
        kind: 'team.leave.decided',
        to: [found.employee_email],
        relatedId: found.employee_id,
        dedupeKey: `team.leave.decided:${id}:${request.status}:${request.decidedAt}`,
        ...leaveDecidedEmail({
          employeeName: knownAs({ employeeName: found.employee_name, businessName: found.business_name }),
          typeLabel: LEAVE_TYPES[request.type],
          from: request.from,
          to: request.to,
          days: request.days,
          approved: input.approve,
          decidedBy: input.as === 'ensaar' ? 'Ensaar' : input.by,
          note,
        }),
      });
    }
    return ok(request);
  });
}

/** Ensaar changes a balance: an opening balance, encashment, a correction. */
export async function adjustLeave(employeeId: string, input: { year: unknown; days: unknown; reason: unknown; by: string }): Promise<Outcome<null>> {
  const year = Number(input.year);
  const days = Math.round(Number(input.days) * 2) / 2;
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 300) : '';
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return refuse(400, 'Choose the year.');
  if (!Number.isFinite(days) || days === 0 || Math.abs(days) > 60) return refuse(400, 'Enter the days to add (or a negative number to take away), in half days.');
  if (reason.length < 3) return refuse(400, 'Give a reason, e.g. "Encashed at year end".');
  await requireDatabase()`
    INSERT INTO ensaar_leave_adjustments (id, employee_id, year, days, reason, created_by) VALUES (${randomUUID()}, ${employeeId}, ${year}, ${days}, ${reason}, ${input.by})
  `;
  return ok(null);
}

export type CompanyLeaveRow = LeaveRequest & { employeeName: string };

/** A client's view: its employees' leave waiting for a decision and coming up. Dates and type only. */
export async function companyLeave(companyId: string): Promise<CompanyLeaveRow[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql<(Row & { employee_name: string; business_name: string | null })[]>`
    SELECT ${sql(COLUMNS.map((c) => `r.${c}`))}, e.employee_name, e.business_name FROM ensaar_leave_requests r
    JOIN ensaar_eor_employees e ON e.id = r.employee_id
    WHERE e.company_id = ${companyId} AND (r.status = 'pending' OR (r.status IN ('approved', 'declined') AND r.to_day >= ${todayInIndia()}::date - 30))
    ORDER BY (r.status = 'pending') DESC, r.from_day
  `;
  // A client sees what the leave is, not why: the reason is between the employee and whoever decides.
  return rows.map((r) => ({ ...toRequest(r), employeeName: knownAs({ employeeName: r.employee_name, businessName: r.business_name }) }));
}

/** Everything waiting for a decision, across clients, for Basecamp. */
export async function pendingLeave(): Promise<Array<LeaveRequest & { employeeName: string; companyName: string; companyId: string }>> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql<(Row & { employee_name: string; business_name: string | null; company_name: string; company_id: string })[]>`
    SELECT ${sql(COLUMNS.map((c) => `r.${c}`))}, e.employee_name, e.business_name, e.company_id,
           COALESCE(c.company->>'legalName', c.company_name) AS company_name
    FROM ensaar_leave_requests r JOIN ensaar_eor_employees e ON e.id = r.employee_id JOIN ensaar_eor_companies c ON c.id = e.company_id
    WHERE r.status = 'pending' ORDER BY r.created_at
  `;
  return rows.map((r) => ({
    ...toRequest(r),
    employeeName: r.business_name ? `${r.employee_name} (${r.business_name})` : r.employee_name,
    companyName: r.company_name,
    companyId: r.company_id,
  }));
}

/** Unpaid days per employee in a month (YYYY-MM), for the payroll inputs on the 10th. */
export async function lossOfPay(month: string): Promise<Array<{ employeeId: string; employeeName: string; companyName: string; days: number }>> {
  if (!hasDatabase()) return [];
  const sql = db();
  const first = `${month}-01`;
  const rows = await sql<(Row & { employee_name: string; company_name: string; company_id: string })[]>`
    SELECT ${sql(COLUMNS.map((c) => `r.${c}`))}, e.employee_name, e.company_id, COALESCE(c.company->>'legalName', c.company_name) AS company_name
    FROM ensaar_leave_requests r JOIN ensaar_eor_employees e ON e.id = r.employee_id JOIN ensaar_eor_companies c ON c.id = e.company_id
    WHERE r.status = 'approved' AND r.unpaid_days > 0 AND r.to_day >= ${first}::date AND r.from_day < (${first}::date + INTERVAL '1 month')
  `;
  const totals = new Map<string, { employeeId: string; employeeName: string; companyName: string; days: number }>();
  for (const r of rows) {
    const req = toRequest(r);
    const holidays = await holidaysFor(r.company_id, Number(month.slice(0, 4)));
    const days = unpaidDaysInMonth(req, month, holidays);
    if (!days) continue;
    const t = totals.get(req.employeeId) ?? { employeeId: req.employeeId, employeeName: r.employee_name, companyName: r.company_name, days: 0 };
    t.days += days;
    totals.set(req.employeeId, t);
  }
  return [...totals.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

/** Staff hear about requests still waiting after three days, once. */
export async function remindStalePending(sql: Executor = db()): Promise<number> {
  if (!hasDatabase()) return 0;
  const stale = await sql<{ id: string; employee_name: string; company_name: string; from_day: Date }[]>`
    SELECT r.id, e.employee_name, COALESCE(c.company->>'legalName', c.company_name) AS company_name, r.from_day
    FROM ensaar_leave_requests r JOIN ensaar_eor_employees e ON e.id = r.employee_id JOIN ensaar_eor_companies c ON c.id = e.company_id
    WHERE r.status = 'pending' AND r.created_at < NOW() - INTERVAL '3 days'
  `;
  if (!stale.length) return 0;
  const to = await staffRecipients(sql);
  for (const s of stale) {
    await enqueue(sql, {
      kind: 'basecamp.leave.stale',
      to,
      relatedId: s.id,
      dedupeKey: `basecamp.leave.stale:${s.id}`,
      ...leaveStaleStaffEmail({ employeeName: s.employee_name, companyName: s.company_name, from: day(s.from_day) }),
    });
  }
  return stale.length;
}
