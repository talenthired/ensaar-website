'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquareWarning } from 'lucide-react';
import { CONDUCT_REASONS, type ConductReason } from '@/lib/eor/conduct';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

type Concern = { id: string; employeeName: string; reason: ConductReason; raisedAt: string; status: 'open' | 'closed'; outcome: string | null };
type Person = { id: string; employeeName: string };

/**
 * Raise a concern about an employee's performance, attendance or conduct, in
 * writing, with the facts (master agreement clause 3). Only Ensaar, as
 * employer, acts on it; the client sees whether it is open or closed.
 */
export function PortalConcerns({ say }: { say: Say }) {
  const [concerns, setConcerns] = useState<Concern[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState<{ employeeId: string; reason: ConductReason; details: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([fetch('/api/portal/concerns', { cache: 'no-store' }), fetch('/api/portal/employees?filter=current&page=1', { cache: 'no-store' })]);
    if (!c.ok) return say('error', await apiError(c, 'Unable to load concerns.'));
    setConcerns((await c.json()).concerns);
    if (p.ok) setPeople(((await p.json()).items as Person[]).map((x) => ({ id: x.id, employeeName: x.employeeName })));
  }, [say]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!concerns) return null;
  return (
    <section className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-primary"><MessageSquareWarning className="h-4 w-4 text-ink-secondary" aria-hidden /> Concerns about an employee</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
            If you have a concern about someone&apos;s performance, attendance or conduct, tell Ensaar here with the facts. Ensaar, as their employer, talks to them
            and decides any action; please do not discipline them or tell them their job is at risk yourself.
          </p>
        </div>
        {!form && people.length > 0 && (
          <button type="button" className={cn(buttonClass, 'shrink-0 px-3 py-1.5')} onClick={() => setForm({ employeeId: people[0]!.id, reason: 'performance', details: '' })}>
            Raise a concern
          </button>
        )}
      </div>

      {form && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const response = await fetch('/api/portal/concerns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
              if (!response.ok) throw new Error(await apiError(response, 'Please try again.'));
              setConcerns((await response.json()).concerns);
              setForm(null);
              say('ok', 'Thank you. Ensaar has your concern and will be in touch about next steps.');
            } catch (cause) {
              say('error', cause instanceof Error ? cause.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">Employee</span>
              <select className={inputClass} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                {people.map((p) => <option key={p.id} value={p.id}>{p.employeeName}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">About</span>
              <select className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as ConductReason })}>
                {(Object.keys(CONDUCT_REASONS) as ConductReason[]).map((r) => <option key={r} value={r}>{CONDUCT_REASONS[r]}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">What happened: when, what, and any evidence (links, dates, examples)</span>
            <textarea className="min-h-32 w-full rounded-lg border border-line-subtle bg-bg-primary p-3 text-sm text-ink-primary" value={form.details} maxLength={4000} onChange={(e) => setForm({ ...form, details: e.target.value })} required />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || form.details.trim().length < 20} className={primaryButtonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send to Ensaar
            </button>
            <button type="button" className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {concerns.length > 0 && (
        <ul className="divide-y divide-line-subtle text-sm">
          {concerns.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="font-medium text-ink-primary">{c.employeeName}</span>
                <span className="text-ink-secondary"> · {CONDUCT_REASONS[c.reason]} · raised {formatDay(c.raisedAt)}</span>
                {c.outcome && <span className="block text-ink-secondary">Outcome: {c.outcome}</span>}
              </span>
              <Badge tone={c.status === 'open' ? 'attention' : 'good'}>{c.status === 'open' ? 'With Ensaar' : 'Closed'}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
