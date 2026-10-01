'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Circle, Loader2, PenLine, X } from 'lucide-react';
import type { CompanyView, EmployeeDetail, EmployeeListItem } from '@/lib/eor/views';
import { EMPLOYEE_STATUS_LABELS_CUSTOMER, formatDay, formatInr, formatUsd, signatureMatches } from '@/lib/eor/onboarding';
import { Badge, EmptyState, FilterChips, Pagination, STATUS_TONE, SearchBox, buttonClass, inputClass, primaryButtonClass, useQueryState } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

type ListResult = { items: EmployeeListItem[]; total: number; page: number; pageSize: number; counts: Record<string, number> };

const FILTERS = [
  { key: 'current', label: 'Current', keys: ['awaiting_signature', 'signed', 'onboarding', 'active'] },
  { key: 'awaiting_signature', label: 'Awaiting signature', keys: ['awaiting_signature'] },
  { key: 'onboarding', label: 'Onboarding', keys: ['onboarding', 'signed'] },
  { key: 'active', label: 'Active', keys: ['active'] },
  { key: 'starting_soon', label: 'Starting in 14 days', keys: [] },
  { key: 'exited', label: 'Left', keys: ['exited'] },
];

/** The customer's employees: find anyone among hundreds, see their progress, sign their schedules. */
export function PortalEmployees({ view, say, onSigned }: { view: CompanyView; say: Say; onSigned: () => void }) {
  const [query, setQuery] = useQueryState({ q: '', filter: 'current', page: '1' });
  const [data, setData] = useState<ListResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signing, setSigning] = useState<EmployeeListItem[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const masterReady = view.status === 'signed' || view.status === 'active';
  const canSign = view.me.isSignatory && masterReady && view.readyToSign;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ q: query.q, filter: query.filter, page: query.page });
    const response = await fetch(`/api/portal/employees?${params}`, { cache: 'no-store' });
    if (!response.ok) return say('error', await apiError(response, 'Unable to load employees.'));
    setData(await response.json());
    setSelected(new Set());
  }, [query.q, query.filter, query.page, say]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewAll() {
    // Every schedule waiting for a signature, not just this page.
    const response = await fetch('/api/portal/employees?filter=awaiting_signature&pageSize=100', { cache: 'no-store' });
    if (!response.ok) return say('error', await apiError(response, 'Unable to load schedules.'));
    const json = (await response.json()) as ListResult;
    setSigning(json.items);
  }

  const counts = data?.counts ?? {};
  const awaiting = counts.awaiting_signature ?? 0;
  const pageAwaiting = data?.items.filter((e) => e.status === 'awaiting_signature') ?? [];

  if (signing) {
    return (
      <SignSchedules
        view={view}
        schedules={signing}
        onCancel={() => setSigning(null)}
        onDone={(n) => {
          setSigning(null);
          say('ok', `Signed ${n} schedule${n === 1 ? '' : 's'}. Ensaar countersigns and starts each onboarding, usually within one working day.`);
          void load();
          onSigned();
        }}
        say={say}
      />
    );
  }

  return (
    <div className="space-y-4">
      {awaiting > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          <p>
            <strong>{awaiting} employee{awaiting === 1 ? '' : 's'}</strong> {awaiting === 1 ? 'is' : 'are'} waiting for{' '}
            {view.me.isSignatory ? 'your' : `${view.signatory?.name ?? 'the signatory'}'s`} signature on a one-page Schedule A.
            {!masterReady && ' Sign the agreement first (Overview), then these.'}
            {masterReady && !view.readyToSign && ' Our legal team is finalising the agreement; signing opens shortly.'}
          </p>
          {canSign && (
            <button type="button" onClick={() => void reviewAll()} className={primaryButtonClass}>
              <PenLine className="h-4 w-4" aria-hidden /> Review and sign {awaiting === 1 ? '' : awaiting > 100 ? 'the first 100' : `all ${awaiting}`}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox label="Search employees" placeholder="Name or job title" value={query.q} onChange={(q) => setQuery({ q, page: '1' })} />
        <FilterChips
          label="Filter employees"
          options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: f.keys.length ? f.keys.reduce((n, k) => n + (counts[k] ?? 0), 0) : undefined }))}
          value={query.filter}
          onChange={(filter) => setQuery({ filter, page: '1' })}
        />
      </div>

      {canSign && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-ink-primary/20 bg-bg-primary p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button type="button" className={primaryButtonClass} onClick={() => setSigning(pageAwaiting.filter((e) => selected.has(e.id)))}>
            <PenLine className="h-4 w-4" aria-hidden /> Review and sign selected
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs underline">
            Clear
          </button>
        </div>
      )}

      {!data ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : data.items.length === 0 ? (
        <EmptyState title={query.q || query.filter !== 'current' ? 'No employees match.' : 'No employees yet.'}>
          {!query.q && query.filter === 'current' && 'Tell your Ensaar contact who you want to hire; each person appears here with a schedule to sign.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-bg-primary">
          {data.items.map((e) => (
            <li key={e.id}>
              <div className="flex items-center gap-3 p-3 sm:p-4">
                {canSign && (
                  <span className="w-5 shrink-0">
                    {e.status === 'awaiting_signature' && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${e.employeeName} to sign`}
                        checked={selected.has(e.id)}
                        onChange={(ev) =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (ev.target.checked) next.add(e.id);
                            else next.delete(e.id);
                            return next;
                          })
                        }
                      />
                    )}
                  </span>
                )}
                <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-primary">
                      {e.employeeName}
                      {e.legalName && <span className="font-normal text-ink-secondary"> · legal name {e.legalName}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-secondary">
                      {e.jobTitle} · {e.workState} · starts {formatDay(e.startDate)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-right sm:block">
                      <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{EMPLOYEE_STATUS_LABELS_CUSTOMER[e.status]}</Badge>
                      {e.progress && e.status === 'onboarding' && <span className="mt-0.5 block text-xs text-ink-secondary">{e.progress.done} of {e.progress.total} steps</span>}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-ink-secondary transition', open === e.id && 'rotate-180')} aria-hidden />
                  </span>
                </button>
              </div>
              {open === e.id && <EmployeePanel id={e.id} say={say} />}
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setQuery({ page: String(p) })} />}
    </div>
  );
}

function EmployeePanel({ id, say }: { id: string; say: Say }) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/portal/employees/${id}`, { cache: 'no-store' });
      if (!response.ok) return say('error', await apiError(response, 'Unable to load.'));
      setDetail(await response.json());
    })();
  }, [id, say]);
  if (!detail) return <p className="px-4 pb-4 text-sm text-ink-secondary">Loading…</p>;
  return (
    <div className="grid gap-4 border-t border-line-subtle bg-bg-secondary p-4 text-sm lg:grid-cols-2">
      <dl className="grid grid-cols-2 gap-3">
        {[
          ['Status', EMPLOYEE_STATUS_LABELS_CUSTOMER[detail.status]],
          ['Start date', formatDay(detail.startDate)],
          ...(detail.pricing === 'loaded'
            ? [['Monthly cost', `${formatUsd(detail.loadedCostUsd ?? 0)}, all-in`]]
            : [
                ['Annual gross salary', formatInr(detail.salaryInr ?? 0)],
                ['Ensaar fee', `${formatUsd(detail.monthlyFeeUsd ?? 0)} a month`],
              ]),
          ['Deposit', detail.depositRequired ? 'One month, refundable' : 'Not required at signing'],
          ['Works from', `${detail.workState}, India`],
          ['Schedule', detail.scheduleNumber ? `A-${detail.scheduleNumber}` : '—'],
          ...(detail.signature ? [['Signed', `${detail.signature.name}, ${new Date(detail.signature.at!).toLocaleDateString()}`]] : []),
          ...(detail.signature?.countersignedAt ? [['Countersigned', new Date(detail.signature.countersignedAt).toLocaleDateString()]] : []),
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-secondary">{label}</dt>
            <dd className="text-ink-primary">{value}</dd>
          </div>
        ))}
      </dl>
      {detail.steps ? (
        <ul className="space-y-1.5">
          {detail.steps.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              {s.done ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Circle className="h-4 w-4 text-ink-secondary" aria-hidden />}
              <span className={s.done ? 'text-ink-primary' : 'text-ink-secondary'}>
                {s.label}
                <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-secondary">The onboarding checklist appears once Ensaar countersigns the schedule.</p>
      )}
      {detail.scheduleText && (
        <details className="lg:col-span-2">
          <summary className="cursor-pointer text-sm font-medium text-ink-primary">Read Schedule A-{detail.scheduleNumber}</summary>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-bg-primary p-3 font-sans text-sm leading-relaxed">{detail.scheduleText}</pre>
        </details>
      )}
    </div>
  );
}

/** Review a batch of schedules and sign them all with one signature. */
function SignSchedules({ view, schedules, onCancel, onDone, say }: { view: CompanyView; schedules: EmployeeListItem[]; onCancel: () => void; onDone: (n: number) => void; say: Say }) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const signatory = view.signatory?.name ?? '';

  async function expand(id: string) {
    if (texts[id]) return;
    const response = await fetch(`/api/portal/employees/${id}`, { cache: 'no-store' });
    if (response.ok) {
      const d = (await response.json()) as EmployeeDetail;
      setTexts((t) => ({ ...t, [id]: d.scheduleText ?? '' }));
    }
  }

  async function sign(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/portal/schedules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, consent, items: schedules.map((s) => ({ id: s.id, hash: s.scheduleHash })) }),
      });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to sign.'));
      onDone(((await response.json()) as { signed: number }).signed);
    } catch (cause) {
      setConsent(false);
      say('error', cause instanceof Error ? cause.message : 'Unable to sign.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={sign} className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">
            Sign {schedules.length} Schedule A{schedules.length === 1 ? '' : 's'}
          </h2>
          <p className="text-sm text-ink-secondary">Each adds one employee to your agreement with Ensaar on the terms shown. Open any row to read the full schedule.</p>
        </div>
        <button type="button" onClick={onCancel} className={buttonClass} aria-label="Close">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-line-subtle">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-bg-secondary text-xs text-ink-secondary">
            <tr>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2 text-right">Salary</th>
              <th className="px-3 py-2 text-right">Monthly charge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {schedules.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-3 py-2 text-ink-secondary">A-{s.scheduleNumber}</td>
                <td className="px-3 py-2">
                  <details onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && void expand(s.id)}>
                    <summary className="cursor-pointer font-medium text-ink-primary">
                      {s.employeeName} <span className="font-normal text-ink-secondary">· {s.jobTitle}, {s.workState}</span>
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-bg-secondary p-2 font-sans text-xs leading-relaxed">{texts[s.id] ?? 'Loading…'}</pre>
                  </details>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDay(s.startDate)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{s.pricing === 'loaded' ? 'Included' : formatInr(s.salaryInr ?? 0)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{s.pricing === 'loaded' ? `${formatUsd(s.loadedCostUsd ?? 0)} all-in` : `${formatUsd(s.monthlyFeeUsd ?? 0)} fee`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-sm">
        <label htmlFor="sched-sign-name" className="mb-1 block font-medium text-ink-primary">Type {signatory} to sign</label>
        <input id="sched-sign-name" className={cn(inputClass, 'font-serif text-lg italic')} value={name} onChange={(e) => setName(e.target.value)} placeholder={signatory} autoComplete="off" />
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-primary">
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I have reviewed these {schedules.length} schedule{schedules.length === 1 ? '' : 's'}, I am authorised to sign them for {view.name}, and I agree to sign electronically.
        </span>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !consent || !signatureMatches(name, signatory)} className={primaryButtonClass}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign {schedules.length === 1 ? 'schedule' : `all ${schedules.length}`}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
