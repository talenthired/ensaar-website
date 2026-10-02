'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plane } from 'lucide-react';
import { LEAVE_STATUSES, LEAVE_TYPES, leaveDays, type LeaveStatus, type LeaveType } from '@/lib/eor/leave';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Say = (kind: 'ok' | 'error', text: string) => void;
type Request = {
  id: string; type: LeaveType; from: string; to: string; halfStart: boolean; halfEnd: boolean; days: number; paidDays: number; unpaidDays: number;
  reason: string | null; status: LeaveStatus; decidedBy: string | null; decidedAs: string | null; note: string | null;
};
type Summary = {
  year: number;
  balance: { earned: number; adjusted: number; taken: number; waiting: number; left: number };
  encashable: number;
  probationEnds: string;
  requests: Request[];
  paternityUsed: number;
};

const TONE: Record<LeaveStatus, 'good' | 'attention' | 'neutral'> = { approved: 'good', pending: 'attention', declined: 'neutral', cancelled: 'neutral' };
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** The employee's leave: balance, ask for leave or record sickness, and history. */
export function Leave({ say, holidays }: { say: Say; holidays: string[] }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<Summary | null>(null);
  const [form, setForm] = useState({ type: 'pto' as LeaveType, from: '', to: '', halfStart: false, halfEnd: false, reason: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/team/leave?year=${year}`, { cache: 'no-store' });
    if (!response.ok) return say('error', 'Unable to load your leave. Reload to try again.');
    setData(await response.json());
  }, [year, say]);
  useEffect(() => {
    void load();
  }, [load]);

  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const count = form.from && form.to && form.to >= form.from ? leaveDays({ ...form, to: form.to, holidays: holidaySet }) : 0;

  const post = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/team/leave', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Reload the page to sign in again.' : json.error || 'Please try again.');
      say('ok', success);
      await load();
      return true;
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const b = data.balance;
  return (
    <div className="space-y-4">
      <div className="flex gap-1" role="group" aria-label="Year">
        {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
          <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)} className={cn('rounded-lg px-3 py-1.5 text-sm', y === year ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary')}>
            {y}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Paid leave left', days(b.left)],
          ['Earned this year', days(b.earned + b.adjusted)],
          ['Taken', days(b.taken)],
          ['Waiting for approval', days(b.waiting)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line-subtle bg-bg-primary p-4">
            <p className="text-xs text-ink-secondary">{label}</p>
            <p className="mt-1 text-xl font-semibold text-ink-primary">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-secondary">
        Paid leave covers personal time and sickness. Unused days do not carry over: after probation (which ends {formatDay(data.probationEnds)}), up to 5 are paid out at the end of the year.
      </p>

      <form
        className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const sick = form.type === 'sick';
          if (await post({ action: 'request', ...form }, sick ? 'Sick leave recorded. Your client has been told. Get well soon.' : 'Leave requested. Your client manager will approve it in their portal, and we will email you.')) {
            setForm({ type: 'pto', from: '', to: '', halfStart: false, halfEnd: false, reason: '' });
          }
        }}
      >
        <h3 className="flex items-center gap-2 font-medium text-ink-primary"><Plane className="h-4 w-4 text-ink-secondary" aria-hidden /> Ask for leave, or record sick leave</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Kind</span>
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}>
              {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((t) => <option key={t} value={t}>{LEAVE_TYPES[t]}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">First day</span>
            <input type="date" className={inputClass} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to && form.to >= e.target.value ? form.to : e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Last day</span>
            <input type="date" className={inputClass} value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
          </label>
        </div>
        {form.type !== 'maternity' && (
          <div className="flex flex-wrap gap-4 text-sm text-ink-primary">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.halfStart} onChange={(e) => setForm({ ...form, halfStart: e.target.checked })} /> Half day on the first day</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.halfEnd} onChange={(e) => setForm({ ...form, halfEnd: e.target.checked })} /> Half day on the last day</label>
          </div>
        )}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Note for your manager (optional)</span>
          <input className={inputClass} value={form.reason} maxLength={500} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || count <= 0} className={primaryButtonClass}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {form.type === 'sick' ? 'Record sick leave' : 'Ask for leave'}
          </button>
          {count > 0 && (
            <span className="text-sm text-ink-secondary">
              {form.type === 'maternity' ? `${count} calendar days` : `${days(count)} of leave`}
              {(form.type === 'pto' || form.type === 'sick') && count > b.left ? `; you have ${days(b.left)} of paid leave left${form.type === 'sick' ? ', so the rest is unpaid' : ''}` : ''}
            </span>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-line-subtle bg-bg-primary">
        <h3 className="border-b border-line-subtle p-4 font-medium text-ink-primary">Your leave in {data.year}</h3>
        {data.requests.filter((r) => r.from.startsWith(String(data.year))).length === 0 ? (
          <p className="p-4 text-sm text-ink-secondary">No leave yet this year.</p>
        ) : (
          <ul>
            {data.requests.filter((r) => r.from.startsWith(String(data.year))).map((r) => (
              <li key={r.id} className="flex flex-col gap-2 border-b border-line-subtle p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">
                  <span className="font-medium text-ink-primary">{LEAVE_TYPES[r.type]}</span>{' '}
                  <span className="text-ink-secondary">
                    {r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} to ${formatDay(r.to)}`} · {r.type === 'maternity' ? `${r.days} calendar days` : days(r.days)}
                    {r.unpaidDays > 0 && r.type !== 'unpaid' ? ` (${days(r.unpaidDays)} unpaid)` : ''}
                  </span>
                  {r.note && <span className="block text-xs text-ink-secondary">Note: {r.note}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={TONE[r.status]}>{r.decidedAs === 'auto' ? 'Recorded' : LEAVE_STATUSES[r.status]}</Badge>
                  {(r.status === 'pending' || (r.status === 'approved' && r.from > new Date().toISOString().slice(0, 10))) && (
                    <button type="button" disabled={busy} className={cn(buttonClass, 'px-3 py-1')} onClick={() => post({ action: 'cancel', id: r.id }, 'Leave cancelled.')}>
                      Cancel
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
