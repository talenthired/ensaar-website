'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Loader2, Send, XCircle } from 'lucide-react';
import { EMPLOYEE_STATUS_LABELS, customerPrice, employeeSteps, formatDay, formatInr, todayInIndia, type EmployeeStatus, type Pricing } from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';
import { Badge, EmptyState, FilterChips, Notice, Pagination, STATUS_TONE, SearchBox, buttonClass, primaryButtonClass, useQueryState } from '@/components/eor/ui';

type Employee = {
  id: string;
  companyId: string;
  companyName?: string;
  status: EmployeeStatus;
  employeeName: string;
  jobTitle: string;
  workState: string;
  salaryInr: number;
  startDate: string;
  pricing: Pricing;
  monthlyFeeUsd: number | null;
  loadedCostUsd: number | null;
  depositRequired: boolean;
  scheduleNumber: number | null;
  employeeCase: { steps: Record<string, unknown> } | null;
};

type Result = { items: Employee[]; total: number; page: number; pageSize: number; counts: Record<string, number> };

const FILTER_ORDER: Array<{ key: string; label: string; count: (c: Record<string, number>) => number | undefined }> = [
  { key: 'current', label: 'Current', count: (c) => sum(c, ['draft', 'awaiting_signature', 'signed', 'onboarding', 'active']) },
  { key: 'needs_action', label: 'Needs action', count: () => undefined },
  { key: 'draft', label: 'Draft', count: (c) => c.draft ?? 0 },
  { key: 'awaiting_signature', label: 'Awaiting signature', count: (c) => c.awaiting_signature ?? 0 },
  { key: 'signed', label: 'To countersign', count: (c) => c.signed ?? 0 },
  { key: 'onboarding', label: 'Onboarding', count: (c) => c.onboarding ?? 0 },
  { key: 'active', label: 'Active', count: (c) => c.active ?? 0 },
  { key: 'starting_soon', label: 'Starting in 14 days', count: () => undefined },
  { key: 'exited', label: 'Exited', count: (c) => c.exited ?? 0 },
  { key: 'all', label: 'All', count: () => undefined },
];

function sum(c: Record<string, number>, keys: string[]) {
  return keys.reduce((n, k) => n + (c[k] ?? 0), 0);
}

/**
 * Employees in a table that stays usable at hundreds of rows: server-side
 * search, status filters with counts, pages of 25/50/100, and bulk actions on a
 * selection (company scope only).
 */
export function EmployeesTable({ companyId, reloadKey, onChanged }: { companyId?: string; reloadKey?: number; onChanged?: () => void }) {
  const [query, setQuery] = useQueryState({ q: '', filter: 'current', page: '1', size: '25' });
  const [data, setData] = useState<Result | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const endpoint = companyId ? `/api/basecamp/clients/${companyId}/employees` : '/api/basecamp/employees';

  const load = useCallback(async () => {
    const params = new URLSearchParams({ q: query.q, filter: query.filter, page: query.page, pageSize: query.size });
    const response = await fetch(`${endpoint}?${params}`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setNotice({ kind: 'error', text: json.error || 'Unable to load employees.' });
    setData(json);
    setSelected(new Set());
  }, [endpoint, query.q, query.filter, query.page, query.size]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const selectedRows = useMemo(() => data?.items.filter((e) => selected.has(e.id)) ?? [], [data, selected]);
  const canSend = selectedRows.length > 0 && selectedRows.every((e) => e.status === 'draft');
  const canCountersign = selectedRows.length > 0 && selectedRows.every((e) => e.status === 'signed');
  const canCancel = selectedRows.length > 0 && selectedRows.every((e) => ['draft', 'awaiting_signature', 'signed'].includes(e.status));

  async function bulk(action: 'send' | 'countersign' | 'cancel', confirmPastStart = false) {
    if (!companyId) return;
    const n = selectedRows.length;
    if (action === 'cancel' && !window.confirm(`Cancel ${n} hire${n === 1 ? '' : 's'}? Signed schedules are voided (kept in history).`)) return;
    if (action === 'countersign' && !confirmPastStart && !window.confirm(`Countersign ${n} schedule${n === 1 ? '' : 's'} for Ensaar? This starts each onboarding.`)) return;
    setBusy(action);
    setNotice(null);
    try {
      const response = await fetch(`/api/basecamp/clients/${companyId}/employees/batch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ids: [...selected], confirmPastStart }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (action === 'countersign' && /start date has passed/.test(json.error ?? '')) {
          if (window.confirm(`${json.error}\n\nCountersign with a backdated start? This is recorded in the audit log.`)) return void (await bulk(action, true));
        }
        throw new Error(json.error || 'Unable to do that.');
      }
      const verb = action === 'send' ? 'Sent to the customer' : action === 'countersign' ? 'Countersigned' : 'Cancelled';
      setNotice({ kind: 'ok', text: `${verb}: ${json.done}.${json.failed?.length ? ` Not changed: ${json.failed.length}.` : ''}` });
      await load();
      onChanged?.();
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to do that.' });
    } finally {
      setBusy(null);
    }
  }

  const counts = data?.counts ?? {};
  const allOnPage = data?.items.length ? data.items.every((e) => selected.has(e.id)) : false;
  const today = todayInIndia();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox
          label="Search employees"
          placeholder={companyId ? 'Name, title or email' : 'Name, title, email or client'}
          value={query.q}
          onChange={(q) => setQuery({ q, page: '1' })}
        />
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Rows
          <select className="rounded-lg border border-line-subtle bg-bg-primary px-2 py-1 text-sm" value={query.size} onChange={(e) => setQuery({ size: e.target.value, page: '1' })}>
            {['25', '50', '100'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <FilterChips
        label="Filter employees"
        options={FILTER_ORDER.map((f) => ({ key: f.key, label: f.label, count: f.count(counts) }))}
        value={query.filter}
        onChange={(filter) => setQuery({ filter, page: '1' })}
      />

      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      {companyId && selected.size > 0 && (
        <div className="sticky top-[4.5rem] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-ink-primary/20 bg-bg-primary p-3 shadow-sm">
          <span className="text-sm font-medium text-ink-primary">{selected.size} selected</span>
          <button type="button" disabled={!canSend || busy !== null} onClick={() => void bulk('send')} className={primaryButtonClass} title={canSend ? '' : 'Only drafts can be sent'}>
            {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Send for signature
          </button>
          <button type="button" disabled={!canCountersign || busy !== null} onClick={() => void bulk('countersign')} className={cn(buttonClass, 'border-emerald-600 text-emerald-700')} title={canCountersign ? '' : 'Only customer-signed schedules can be countersigned'}>
            {busy === 'countersign' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />} Countersign
          </button>
          <button type="button" disabled={!canCancel || busy !== null} onClick={() => void bulk('cancel')} className={cn(buttonClass, 'text-red-700')}>
            <XCircle className="h-4 w-4" aria-hidden /> Cancel hire
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-ink-secondary underline">
            Clear
          </button>
        </div>
      )}

      {!data ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : data.items.length === 0 ? (
        <EmptyState title={query.q || query.filter !== 'current' ? 'No employees match.' : 'No employees yet.'}>
          {companyId && !query.q && query.filter === 'current' && 'Add one with the form, or import a spreadsheet.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line-subtle bg-bg-primary">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line-subtle bg-bg-secondary text-xs uppercase tracking-wide text-ink-secondary">
              <tr>
                {companyId && (
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={allOnPage}
                      onChange={(e) => setSelected(e.target.checked ? new Set(data.items.map((i) => i.id)) : new Set())}
                    />
                  </th>
                )}
                <th className="px-3 py-2.5 font-medium">Employee</th>
                {!companyId && <th className="px-3 py-2.5 font-medium">Client</th>}
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Start</th>
                <th className="px-3 py-2.5 font-medium">Works from</th>
                <th className="px-3 py-2.5 text-right font-medium">Salary</th>
                <th className="px-3 py-2.5 text-right font-medium">Customer pays / month</th>
                <th className="px-3 py-2.5 font-medium">Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {data.items.map((e) => {
                const steps = employeeSteps(e);
                const done = e.employeeCase ? steps.filter((s) => e.employeeCase?.steps[s.key]).length : 0;
                const late = ['onboarding', 'signed', 'awaiting_signature', 'draft'].includes(e.status) && e.startDate < today;
                return (
                  <tr key={e.id} className={cn('hover:bg-bg-secondary', selected.has(e.id) && 'bg-bg-secondary')}>
                    {companyId && (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${e.employeeName}`}
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
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <Link href={`/basecamp/employees/${e.id}`} className="font-medium text-ink-primary hover:underline">
                        {e.employeeName}
                      </Link>
                      <span className="block text-xs text-ink-secondary">{e.jobTitle}</span>
                    </td>
                    {!companyId && (
                      <td className="px-3 py-2.5">
                        <Link href={`/basecamp/clients/${e.companyId}`} className="text-ink-primary hover:underline">
                          {e.companyName}
                        </Link>
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge>
                      {e.status === 'onboarding' && <span className="mt-0.5 block text-xs text-ink-secondary">{done} of {steps.length} steps</span>}
                    </td>
                    <td className={cn('px-3 py-2.5 whitespace-nowrap', late && 'font-medium text-orange-700')}>
                      {formatDay(e.startDate)}
                      {late && <span className="block text-xs">passed</span>}
                    </td>
                    <td className="px-3 py-2.5">{e.workState}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatInr(e.salaryInr)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {customerPrice(e)}
                      {e.depositRequired && <span className="block text-xs text-ink-secondary">+ 1-month deposit</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-secondary">{e.scheduleNumber ? `A-${e.scheduleNumber}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setQuery({ page: String(p) })} />}
    </div>
  );
}
