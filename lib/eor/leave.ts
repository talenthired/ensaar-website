/**
 * Leave, as the Employee Handbook sets it out. Pure and shared (no
 * 'server-only'): the portal shows the same numbers the server enforces.
 *
 *   - paid leave (PTO): PTO_DAYS_PER_YEAR a calendar year, pro-rated by month in
 *     the joining year, LONG_SERVICE_EXTRA_DAYS more once LONG_SERVICE_YEARS are
 *     complete; personal and sick time come from the same balance;
 *   - no carry forward: after probation up to ENCASHMENT_MAX_DAYS unused days are
 *     encashed at the end of the year and the rest lapse;
 *   - sick leave is never refused: past the balance, the extra days are unpaid;
 *   - maternity (26 weeks, after MATERNITY_SERVICE_MONTHS) and paternity
 *     (PATERNITY_DAYS) are separate; unpaid leave is by agreement.
 *
 * Days are working days: Monday to Friday, less the client's approved holidays.
 * Maternity leave runs in calendar days, as the Maternity Benefit Act counts it.
 */

import {
  ENCASHMENT_MAX_DAYS,
  LONG_SERVICE_EXTRA_DAYS,
  LONG_SERVICE_YEARS,
  MATERNITY_SERVICE_MONTHS,
  MATERNITY_WEEKS,
  PATERNITY_DAYS,
  PTO_DAYS_PER_YEAR,
} from './handbook';

export const LEAVE_TYPES = {
  pto: 'Paid leave',
  sick: 'Sick leave',
  maternity: 'Maternity leave',
  paternity: 'Paternity leave',
  unpaid: 'Unpaid leave',
} as const;
export type LeaveType = keyof typeof LEAVE_TYPES;
export const isLeaveType = (v: unknown): v is LeaveType => typeof v === 'string' && v in LEAVE_TYPES;

export const LEAVE_STATUSES = { pending: 'Waiting for approval', approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' } as const;
export type LeaveStatus = keyof typeof LEAVE_STATUSES;

/** Sick leave is recorded, not asked for; the others need the client's approval. */
export const autoApproved = (type: LeaveType) => type === 'sick';

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const isIsoDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parse(v)) && iso(parse(v)) === v;

/** Whole months from a start date to a day (how long someone has worked). */
export function monthsOfService(startDate: string, on: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number) as [number, number, number];
  const [y, m, d] = on.split('-').map(Number) as [number, number, number];
  return (y - sy) * 12 + (m - sm) - (d < sd ? 1 : 0);
}

/** Paid leave earned for a calendar year: pro-rated by month in the joining year (a month counts if they joined by the 15th). */
export function ptoEntitlement(startDate: string, year: number): number {
  const startYear = Number(startDate.slice(0, 4));
  if (year < startYear) return 0;
  const longService = monthsOfService(startDate, `${year}-12-31`) >= LONG_SERVICE_YEARS * 12 ? LONG_SERVICE_EXTRA_DAYS : 0;
  const perYear = PTO_DAYS_PER_YEAR + longService;
  if (year > startYear) return perYear;
  const month = Number(startDate.slice(5, 7));
  const day = Number(startDate.slice(8, 10));
  const months = 12 - month + (day <= 15 ? 1 : 0);
  // Rounded to the nearest half day.
  return Math.round((perYear * months * 2) / 12) / 2;
}

/** Monday to Friday, less the given holidays (YYYY-MM-DD). */
export function isWorkingDay(day: string, holidays: ReadonlySet<string>): boolean {
  const weekday = new Date(parse(day)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(day);
}

/**
 * The leave a request takes. Working days for most types, with a half day off
 * the first and/or last day when asked; calendar days for maternity.
 */
export function leaveDays(input: { type: LeaveType; from: string; to: string; halfStart?: boolean; halfEnd?: boolean; holidays?: ReadonlySet<string> }): number {
  const from = parse(input.from);
  const to = parse(input.to);
  if (to < from) return 0;
  if (input.type === 'maternity') return Math.round((to - from) / DAY) + 1;
  const holidays = input.holidays ?? new Set<string>();
  let days = 0;
  for (let t = from; t <= to; t += DAY) if (isWorkingDay(iso(t), holidays)) days += 1;
  if (days === 0) return 0;
  if (input.halfStart && isWorkingDay(input.from, holidays)) days -= 0.5;
  if (input.halfEnd && isWorkingDay(input.to, holidays) && !(input.from === input.to && input.halfStart)) days -= 0.5;
  return days;
}

export type LeaveRecord = { type: LeaveType; status: LeaveStatus; from: string; paidDays: number };
export type Adjustment = { year: number; days: number };

/** Paid leave for a year: earned, adjusted, taken (approved), waiting (pending), and what is left. */
export function ptoBalance(input: { startDate: string; year: number; requests: LeaveRecord[]; adjustments?: Adjustment[] }) {
  const earned = ptoEntitlement(input.startDate, input.year);
  const adjusted = (input.adjustments ?? []).filter((a) => a.year === input.year).reduce((n, a) => n + a.days, 0);
  const inYear = input.requests.filter((r) => (r.type === 'pto' || r.type === 'sick') && Number(r.from.slice(0, 4)) === input.year);
  const taken = inYear.filter((r) => r.status === 'approved').reduce((n, r) => n + r.paidDays, 0);
  const waiting = inYear.filter((r) => r.status === 'pending').reduce((n, r) => n + r.paidDays, 0);
  return { earned, adjusted, taken, waiting, left: earned + adjusted - taken - waiting };
}

/** Days encashed at the end of a year: only after probation, at most ENCASHMENT_MAX_DAYS. */
export function encashableDays(input: { left: number; probationEnds: string; year: number }): number {
  if (input.probationEnds > `${input.year}-12-31`) return 0;
  return Math.max(0, Math.min(ENCASHMENT_MAX_DAYS, Math.floor(input.left * 2) / 2));
}

export type LeaveCheck = { ok: true; days: number; paidDays: number; unpaidDays: number } | { ok: false; error: string };

/**
 * Whether a request can be made, and how its days split between paid and
 * unpaid. Sick leave past the balance becomes unpaid rather than refused.
 */
export function checkLeaveRequest(input: {
  type: LeaveType;
  from: string;
  to: string;
  halfStart?: boolean;
  halfEnd?: boolean;
  startDate: string;
  today: string;
  holidays?: ReadonlySet<string>;
  /** Paid leave left this year, before this request. */
  ptoLeft: number;
  /** Paternity days already taken or waiting. */
  paternityUsed?: number;
}): LeaveCheck {
  if (!isIsoDay(input.from) || !isIsoDay(input.to)) return { ok: false, error: 'Choose the first and last day.' };
  if (input.to < input.from) return { ok: false, error: 'The last day is before the first.' };
  if (input.from < input.startDate) return { ok: false, error: 'Leave cannot start before your start date.' };
  if (input.from.slice(0, 4) !== input.to.slice(0, 4) && input.type !== 'maternity') return { ok: false, error: 'Split leave that runs into the new year into two requests, one for each year.' };
  // Sick leave can be recorded after the fact; planned leave is asked for ahead.
  const backdate = Math.round((parse(input.today) - parse(input.from)) / DAY);
  if (input.type !== 'sick' && input.type !== 'maternity' && backdate > 0) return { ok: false, error: 'Ask for leave before it starts. For sickness, choose sick leave.' };
  if (input.type === 'sick' && backdate > 30) return { ok: false, error: 'Sick leave more than 30 days ago: ask HR to record it.' };
  const days = leaveDays(input);
  if (days <= 0) return { ok: false, error: 'Those dates have no working days in them.' };

  switch (input.type) {
    case 'pto':
      if (days > input.ptoLeft) return { ok: false, error: `You have ${input.ptoLeft} day${input.ptoLeft === 1 ? '' : 's'} of paid leave left. Ask for the rest as unpaid leave.` };
      return { ok: true, days, paidDays: days, unpaidDays: 0 };
    case 'sick': {
      const paid = Math.max(0, Math.min(days, input.ptoLeft));
      return { ok: true, days, paidDays: paid, unpaidDays: days - paid };
    }
    case 'maternity':
      if (monthsOfService(input.startDate, input.from) < MATERNITY_SERVICE_MONTHS) {
        return { ok: false, error: `Paid maternity leave needs ${MATERNITY_SERVICE_MONTHS} months' service. Talk to HR about your options.` };
      }
      if (days > MATERNITY_WEEKS * 7) return { ok: false, error: `Maternity leave is up to ${MATERNITY_WEEKS} weeks. Ask HR about more time.` };
      return { ok: true, days, paidDays: 0, unpaidDays: 0 };
    case 'paternity': {
      const left = PATERNITY_DAYS - (input.paternityUsed ?? 0);
      if (days > left) return { ok: false, error: `Paternity leave is ${PATERNITY_DAYS} days; you have ${Math.max(0, left)} left.` };
      return { ok: true, days, paidDays: 0, unpaidDays: 0 };
    }
    case 'unpaid':
      return { ok: true, days, paidDays: 0, unpaidDays: days };
  }
}

/** The working days a request covers, each with its weight (1, or 0.5 for a half day). */
export function leaveDayList(request: { type: LeaveType; from: string; to: string; halfStart?: boolean; halfEnd?: boolean }, holidays: ReadonlySet<string> = new Set()): Array<{ day: string; weight: number }> {
  const out: Array<{ day: string; weight: number }> = [];
  for (let t = parse(request.from); t <= parse(request.to); t += DAY) {
    const day = iso(t);
    if (request.type !== 'maternity' && !isWorkingDay(day, holidays)) continue;
    let weight = 1;
    if (request.type !== 'maternity') {
      if (day === request.from && request.halfStart) weight -= 0.5;
      if (day === request.to && request.halfEnd && !(request.from === request.to && request.halfStart)) weight -= 0.5;
    }
    out.push({ day, weight });
  }
  return out;
}

/**
 * Unpaid days of a request that fall in a calendar month (YYYY-MM), for the
 * payroll inputs on the 10th. Paid leave is used first, so the unpaid days are
 * the last ones of the request.
 */
export function unpaidDaysInMonth(
  request: { type: LeaveType; from: string; to: string; halfStart?: boolean; halfEnd?: boolean; unpaidDays: number },
  month: string,
  holidays: ReadonlySet<string> = new Set(),
): number {
  let unpaid = request.unpaidDays;
  let inMonth = 0;
  for (const { day, weight } of leaveDayList(request, holidays).reverse()) {
    if (unpaid <= 0) break;
    const share = Math.min(weight, unpaid);
    unpaid -= share;
    if (day.startsWith(month)) inMonth += share;
  }
  return inMonth;
}
