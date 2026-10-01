'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { HOLIDAY_PLAN_LABELS, type Holiday, type HolidayPlanStatus } from '@/lib/eor/holidays';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, EmptyState, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

type Plan = {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  status: HolidayPlanStatus;
  submittedAt: string | null;
  decidedBy: string | null;
  decidedRole: 'client' | 'ensaar' | null;
  note: string | null;
  holidays: Holiday[];
};

/**
 * The holidays the company's employees chose, for the client to approve or send
 * back. India's national holidays are always included and not shown here.
 */
export function PortalHolidays({ say }: { say: Say }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/portal/holidays?year=${year}`, { cache: 'no-store' });
    if (!response.ok) return say('error', await apiError(response, 'Unable to load holidays.'));
    setPlans((await response.json()).plans);
  }, [year, say]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(plan: Plan, decision: 'approved' | 'rejected', note?: string) {
    setBusy(`${decision}:${plan.employeeId}`);
    try {
      const response = await fetch(`/api/portal/holidays/${plan.employeeId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ year, decision, note }) });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to save.'));
      say('ok', decision === 'approved' ? `${plan.employeeName}'s holidays approved.` : `Sent back to ${plan.employeeName} with your note.`);
      setRejecting(null);
      await load();
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(null);
    }
  }

  const waiting = plans?.filter((p) => p.status === 'submitted').length ?? 0;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-secondary">
          Each employee has India&apos;s national holidays and chooses the rest from India&apos;s festival holidays and US public holidays. Approve their choice,
          or ask for a change with a note. {waiting > 0 && <strong className="text-ink-primary">{waiting} waiting for you.</strong>}
        </p>
        <div className="flex gap-1" role="group" aria-label="Year">
          {[thisYear, thisYear + 1].map((y) => (
            <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)} className={cn('rounded-lg px-3 py-1.5 text-sm', y === year ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary')}>
              {y}
            </button>
          ))}
        </div>
      </div>
      {!plans ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : plans.length === 0 ? (
        <EmptyState title={`No holiday choices for ${year} yet.`}>Employees choose in the Ensaar employee portal; you are emailed when one needs approval.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li key={p.employeeId} className="rounded-xl border border-line-subtle bg-bg-primary p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span>
                  <span className="block font-medium text-ink-primary">{p.employeeName}</span>
                  <span className="block text-xs text-ink-secondary">{p.jobTitle}{p.submittedAt ? ` · submitted ${formatDay(p.submittedAt)}` : ''}</span>
                </span>
                <Badge tone={p.status === 'approved' ? 'good' : p.status === 'rejected' ? 'bad' : 'info'}>
                  {p.status === 'submitted' ? 'Waiting for your approval' : HOLIDAY_PLAN_LABELS[p.status]}
                </Badge>
              </div>
              <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {p.holidays.map((h) => (
                  <li key={h.id}>{h.name} <span className="text-xs text-ink-secondary">{formatDay(h.date)} · {h.country === 'IN' ? 'India' : 'US'}</span></li>
                ))}
              </ul>
              {p.decidedBy && p.status !== 'submitted' && (
                <p className="mt-2 text-xs text-ink-secondary">
                  {p.status === 'approved' ? 'Approved' : 'Changes asked'} by {p.decidedRole === 'ensaar' ? 'Ensaar' : p.decidedBy}{p.note ? `: ${p.note}` : ''}
                </p>
              )}
              {p.status === 'submitted' && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy !== null} className={cn(buttonClass, 'text-emerald-700')} onClick={() => void decide(p, 'approved')}>
                      {busy === `approved:${p.employeeId}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Approve
                    </button>
                    <button type="button" disabled={busy !== null} className={cn(buttonClass, 'text-red-700')} onClick={() => setRejecting({ id: p.employeeId, note: '' })}>
                      <X className="h-4 w-4" aria-hidden /> Ask for changes
                    </button>
                  </div>
                  {rejecting?.id === p.employeeId && (
                    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(ev) => { ev.preventDefault(); void decide(p, 'rejected', rejecting.note); }}>
                      <input autoFocus aria-label="What should the employee change?" className={inputClass} placeholder="What should the employee change?" value={rejecting.note} onChange={(ev) => setRejecting({ id: p.employeeId, note: ev.target.value })} />
                      <button type="submit" disabled={rejecting.note.trim().length < 3 || busy !== null} className={cn(buttonClass, 'text-red-700')}>Send</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
