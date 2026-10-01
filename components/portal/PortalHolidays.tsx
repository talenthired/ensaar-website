'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Check, Loader2, X } from 'lucide-react';
import { HOLIDAY_PLAN_LABELS, type Holiday, type HolidayPlanStatus } from '@/lib/eor/holidays';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, EmptyState, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

type View = {
  year: number;
  catalogue: Holiday[];
  chosen: Holiday[];
  plan: {
    status: HolidayPlanStatus;
    proposedName: string | null;
    submittedAt: string | null;
    decidedBy: string | null;
    decidedRole: 'client' | 'ensaar' | null;
    note: string | null;
  };
};

/**
 * The company's holiday calendar for a year: proposed by one of its employees,
 * approved (or sent back) here, and then the same for everyone Ensaar employs
 * for the company. India's national holidays are always included.
 */
export function PortalHolidays({ say }: { say: Say }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/portal/holidays?year=${year}`, { cache: 'no-store' });
    if (!response.ok) return say('error', await apiError(response, 'Unable to load holidays.'));
    setView(await response.json());
  }, [year, say]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(decision);
    try {
      const response = await fetch('/api/portal/holidays', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ year, decision, note: note ?? undefined }) });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to save.'));
      say('ok', decision === 'approved' ? `The ${year} calendar is approved. Everyone on your team is emailed.` : 'Sent back with your note.');
      setNote(null);
      await load();
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(null);
    }
  }

  const plan = view?.plan;
  const national = view?.catalogue.filter((h) => h.mandatory) ?? [];
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-secondary">
          Your team in India has one holiday calendar a year: India&apos;s national holidays, plus holidays one of them proposes from India&apos;s festival holidays and US
          public holidays. Once you approve it, it applies to everyone Ensaar employs for you, including later hires.
        </p>
        <div className="flex gap-1" role="group" aria-label="Year">
          {[thisYear, thisYear + 1].map((y) => (
            <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)} className={cn('rounded-lg px-3 py-1.5 text-sm', y === year ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary')}>
              {y}
            </button>
          ))}
        </div>
      </div>
      {!view || !plan ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : plan.status === 'draft' ? (
        <EmptyState title={`No ${year} calendar to approve yet.`}>
          {plan.proposedName ? `${plan.proposedName} has started one but not submitted it.` : 'One of your employees proposes it in the Ensaar employee portal; you are emailed when it is ready.'}
        </EmptyState>
      ) : (
        <div className="rounded-xl border border-line-subtle bg-bg-primary p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <span>
              <span className="block font-medium text-ink-primary">{year} holiday calendar</span>
              <span className="block text-xs text-ink-secondary">
                {plan.proposedName ? `Proposed by ${plan.proposedName}` : 'Proposed by your team'}
                {plan.submittedAt ? ` · submitted ${formatDay(plan.submittedAt)}` : ''}
              </span>
            </span>
            <Badge tone={plan.status === 'approved' ? 'good' : plan.status === 'rejected' ? 'bad' : 'info'}>
              {plan.status === 'submitted' ? 'Waiting for your approval' : HOLIDAY_PLAN_LABELS[plan.status]}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">Always included: {national.map((h) => `${h.name} (${formatDay(h.date)})`).join(', ')}.</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {view.chosen.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden /> {h.name}
                <span className="text-xs text-ink-secondary">{formatDay(h.date)} · {h.country === 'IN' ? 'India' : 'US'}</span>
              </li>
            ))}
          </ul>
          {plan.decidedBy && plan.status !== 'submitted' && (
            <p className="mt-3 text-xs text-ink-secondary">
              {plan.status === 'approved' ? 'Approved' : 'Changes asked'} by {plan.decidedRole === 'ensaar' ? 'Ensaar' : plan.decidedBy}{plan.note ? `: ${plan.note}` : ''}
            </p>
          )}
          {plan.status === 'approved' && <p className="mt-1 text-xs text-ink-secondary">To change an approved calendar, contact Ensaar.</p>}
          {plan.status === 'submitted' && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy !== null} className={cn(buttonClass, 'text-emerald-700')} onClick={() => void decide('approved')}>
                  {busy === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Approve for the whole team
                </button>
                <button type="button" disabled={busy !== null} className={cn(buttonClass, 'text-red-700')} onClick={() => setNote('')}>
                  <X className="h-4 w-4" aria-hidden /> Ask for changes
                </button>
              </div>
              {note !== null && (
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(ev) => { ev.preventDefault(); void decide('rejected'); }}>
                  <input autoFocus aria-label="What should change?" className={inputClass} placeholder="What should change?" value={note} onChange={(ev) => setNote(ev.target.value)} />
                  <button type="submit" disabled={note.trim().length < 3 || busy !== null} className={cn(buttonClass, 'text-red-700')}>Send</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
