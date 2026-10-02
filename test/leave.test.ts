import { describe, expect, it } from 'vitest';
import {
  checkLeaveRequest,
  encashableDays,
  leaveDays,
  monthsOfService,
  ptoBalance,
  ptoEntitlement,
  unpaidDaysInMonth,
} from '@/lib/eor/leave';

const base = { startDate: '2026-10-01', today: '2026-10-05', ptoLeft: 4 };

describe('leave', () => {
  it('pro-rates paid leave by month in the joining year', () => {
    // Joined 1 October: October to December, 3 of 12 months of 17 days.
    expect(ptoEntitlement('2026-10-01', 2026)).toBe(4.5);
    // Joined after the 15th: that month does not count.
    expect(ptoEntitlement('2026-10-20', 2026)).toBe(3);
    expect(ptoEntitlement('2026-10-01', 2027)).toBe(17);
    expect(ptoEntitlement('2026-10-01', 2025)).toBe(0);
  });

  it('adds two days a year once three years are complete', () => {
    expect(ptoEntitlement('2026-10-01', 2028)).toBe(17);
    expect(ptoEntitlement('2026-10-01', 2029)).toBe(19);
    expect(monthsOfService('2026-10-01', '2029-09-30')).toBe(35);
  });

  it('counts working days, less holidays and half days', () => {
    // Fri 9 Oct to Tue 13 Oct 2026: Fri, Mon, Tue.
    expect(leaveDays({ type: 'pto', from: '2026-10-09', to: '2026-10-13' })).toBe(3);
    expect(leaveDays({ type: 'pto', from: '2026-10-09', to: '2026-10-13', holidays: new Set(['2026-10-12']) })).toBe(2);
    expect(leaveDays({ type: 'pto', from: '2026-10-09', to: '2026-10-13', halfStart: true, halfEnd: true })).toBe(2);
    expect(leaveDays({ type: 'pto', from: '2026-10-09', to: '2026-10-09', halfStart: true, halfEnd: true })).toBe(0.5);
    expect(leaveDays({ type: 'pto', from: '2026-10-10', to: '2026-10-11' })).toBe(0);
    // Maternity runs in calendar days.
    expect(leaveDays({ type: 'maternity', from: '2027-05-01', to: '2027-05-07' })).toBe(7);
  });

  it('keeps one balance for personal and sick time, counting what is waiting', () => {
    const b = ptoBalance({
      startDate: '2026-10-01',
      year: 2026,
      requests: [
        { type: 'pto', status: 'approved', from: '2026-10-09', paidDays: 1 },
        { type: 'sick', status: 'approved', from: '2026-10-20', paidDays: 1 },
        { type: 'pto', status: 'pending', from: '2026-12-24', paidDays: 1 },
        { type: 'pto', status: 'declined', from: '2026-11-02', paidDays: 2 },
        { type: 'unpaid', status: 'approved', from: '2026-11-10', paidDays: 0 },
      ],
      adjustments: [{ year: 2026, days: 0.5 }],
    });
    expect(b).toEqual({ earned: 4.5, adjusted: 0.5, taken: 2, waiting: 1, left: 2 });
  });

  it('refuses paid leave beyond the balance, but never sick leave', () => {
    expect(checkLeaveRequest({ ...base, type: 'pto', from: '2026-10-12', to: '2026-10-16' })).toEqual({
      ok: false,
      error: 'You have 4 days of paid leave left. Ask for the rest as unpaid leave.',
    });
    expect(checkLeaveRequest({ ...base, type: 'sick', from: '2026-10-05', to: '2026-10-09' })).toEqual({ ok: true, days: 5, paidDays: 4, unpaidDays: 1 });
  });

  it('asks for planned leave ahead, and allows recording sickness after', () => {
    expect(checkLeaveRequest({ ...base, type: 'pto', from: '2026-10-02', to: '2026-10-02' }).ok).toBe(false);
    expect(checkLeaveRequest({ ...base, type: 'sick', from: '2026-10-02', to: '2026-10-02' }).ok).toBe(true);
    expect(checkLeaveRequest({ ...base, type: 'pto', from: '2026-09-28', to: '2026-09-28' }).ok).toBe(false);
  });

  it('needs six months for maternity and caps paternity at two days', () => {
    expect(checkLeaveRequest({ ...base, type: 'maternity', from: '2027-02-01', to: '2027-03-01' }).ok).toBe(false);
    expect(checkLeaveRequest({ ...base, type: 'maternity', from: '2027-05-03', to: '2027-10-31' })).toMatchObject({ ok: true, paidDays: 0 });
    expect(checkLeaveRequest({ ...base, type: 'paternity', from: '2026-10-12', to: '2026-10-14' }).ok).toBe(false);
    expect(checkLeaveRequest({ ...base, type: 'paternity', from: '2026-10-12', to: '2026-10-13', paternityUsed: 0 })).toMatchObject({ ok: true, days: 2 });
  });

  it('splits leave across the new year', () => {
    expect(checkLeaveRequest({ ...base, type: 'pto', from: '2026-12-31', to: '2027-01-01' }).ok).toBe(false);
  });

  it('encashes up to five days, only after probation', () => {
    expect(encashableDays({ left: 3.5, probationEnds: '2027-01-01', year: 2026 })).toBe(0);
    expect(encashableDays({ left: 8, probationEnds: '2027-01-01', year: 2027 })).toBe(5);
    expect(encashableDays({ left: 3.5, probationEnds: '2027-01-01', year: 2027 })).toBe(3.5);
  });

  it('puts unpaid days in the month they fall, paid days first', () => {
    // Mon 26 Oct to Tue 3 Nov 2026 is 7 working days; the last 3 are unpaid (Fri 30 Oct, Mon 2 and Tue 3 Nov).
    const r = { type: 'sick' as const, from: '2026-10-26', to: '2026-11-03', unpaidDays: 3 };
    expect(unpaidDaysInMonth(r, '2026-10')).toBe(1);
    expect(unpaidDaysInMonth(r, '2026-11')).toBe(2);
    expect(unpaidDaysInMonth({ type: 'unpaid', from: '2026-11-09', to: '2026-11-09', halfEnd: true, unpaidDays: 0.5 }, '2026-11')).toBe(0.5);
  });
});
