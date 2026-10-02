'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveStatus, type LeaveType } from '@/lib/eor/leave';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, EmptyState, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

type Row = {
  id: string; employeeName: string; type: LeaveType; from: string; to: string; days: number; reason: string | null;
  status: LeaveStatus; decidedBy: string | null; decidedAs: string | null; note: string | null;
};

const span = (r: Row) => (r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} to ${formatDay(r.to)}`);
const length = (r: Row) => (r.type === 'maternity' ? `${r.days} calendar days` : `${r.days} working day${r.days === 1 ? '' : 's'}`);

/**
 * Leave for the client's employees: approve or decline what they ask for, and
 * see who is off. Sick leave is recorded, not approved. Ensaar sees every
 * request and can step in.
 */
export function PortalLeave({ say }: { say: Say }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<{ id: string; note: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/portal/leave', { cache: 'no-store' });
    if (!response.ok) return say('error', await apiError(response, 'Unable to load leave.'));
    setRows((await response.json()).leave);
  }, [say]);
  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, approve: boolean, note?: string) => {
    setBusy(id);
    try {
      const response = await fetch('/api/portal/leave', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, approve, note }) });
      if (!response.ok) throw new Error(await apiError(response, 'Please try again.'));
      say('ok', approve ? 'Approved. We have let them know.' : 'Declined. We have let them know, with your note.');
      setDeclining(null);
      await load();
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const pending = rows.filter((r) => r.status === 'pending');
  const upcoming = rows.filter((r) => r.status !== 'pending');
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-primary">Waiting for you</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nothing to decide">When someone asks for leave, it appears here and we email you.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-line-subtle bg-bg-primary p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p className="font-medium text-ink-primary">{r.employeeName}: {LEAVE_TYPES[r.type].toLowerCase()}</p>
                    <p className="text-ink-secondary">{span(r)} · {length(r)}</p>
                    {r.reason && <p className="mt-1 text-ink-secondary">“{r.reason}”</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => decide(r.id, true)}>
                      {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Approve
                    </button>
                    <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setDeclining({ id: r.id, note: '' })}>
                      <X className="h-4 w-4" aria-hidden /> Decline
                    </button>
                  </div>
                </div>
                {declining?.id === r.id && (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void decide(r.id, false, declining.note);
                    }}
                  >
                    <input className={inputClass} placeholder="Why, so they understand (they will see this)" value={declining.note} onChange={(e) => setDeclining({ id: r.id, note: e.target.value })} required />
                    <button type="submit" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')}>Decline</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-primary">Recent and upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-secondary">No leave in the last month or coming up.</p>
        ) : (
          <ul className="rounded-xl border border-line-subtle bg-bg-primary">
            {upcoming.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 border-b border-line-subtle p-4 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="font-medium text-ink-primary">{r.employeeName}</span>{' '}
                  <span className="text-ink-secondary">{LEAVE_TYPES[r.type].toLowerCase()}, {span(r)} · {length(r)}</span>
                </span>
                <Badge tone={r.status === 'approved' ? 'good' : 'neutral'}>
                  {r.decidedAs === 'auto' ? 'Recorded' : `${LEAVE_STATUSES[r.status]}${r.decidedBy ? ` by ${r.decidedBy}` : ''}`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
