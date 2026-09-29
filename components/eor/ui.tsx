'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Shared pieces for the client and employee tables in Basecamp and the portal. */

export const inputClass =
  'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20 aria-[invalid=true]:border-red-500';

export const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary transition hover:bg-bg-tertiary disabled:opacity-50';

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary transition hover:opacity-90 disabled:opacity-50';

const TONES: Record<string, string> = {
  neutral: 'bg-bg-tertiary text-ink-secondary',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  attention: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  bad: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  invited: 'info',
  onboarding: 'warn',
  changes_requested: 'bad',
  signed: 'attention',
  active: 'good',
  cancelled: 'neutral',
  draft: 'neutral',
  awaiting_signature: 'info',
  exited: 'neutral',
};

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn('inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>;
}

/** Debounced search box. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 250);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);
  return (
    <label className="relative block w-full sm:w-80">
      <span className="sr-only">{label}</span>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-secondary" aria-hidden />
      <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className={cn(inputClass, 'pl-9')} />
    </label>
  );
}

export type FilterOption = { key: string; label: string; count?: number };

/** Filter chips with counts, so the size of each bucket is visible before clicking. */
export function FilterChips({ options, value, onChange, label }: { options: FilterOption[]; value: string; onChange: (key: string) => void; label: string }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition',
            value === o.key ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary',
          )}
        >
          {o.label}
          {typeof o.count === 'number' && (
            <span className={cn('rounded px-1.5 text-[11px]', value === o.key ? 'bg-bg-primary/20' : 'bg-bg-tertiary')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="flex items-center justify-between gap-3 text-sm text-ink-secondary" aria-label="Pages">
      <span>
        {from}–{to} of {total}
      </span>
      {pages > 1 && (
        <span className="flex items-center gap-1">
          <button type="button" className={cn(buttonClass, 'px-2 py-1')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="px-2">
            Page {page} of {pages}
          </span>
          <button type="button" className={cn(buttonClass, 'px-2 py-1')} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </span>
      )}
    </nav>
  );
}

export function Notice({ kind, children, onClose }: { kind: 'error' | 'ok' | 'warn'; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
        kind === 'error' && 'border-red-200 bg-red-50 text-red-700',
        kind === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        kind === 'warn' && 'border-amber-200 bg-amber-50 text-amber-900',
      )}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 text-xs underline">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-subtle bg-bg-primary px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-secondary">{children}</div>}
    </div>
  );
}

/** Tab strip; the selected tab is kept in the URL so refresh and back work. */
export function Tabs({ tabs, value, onChange }: { tabs: FilterOption[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-line-subtle px-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
            value === t.key ? 'border-ink-primary text-ink-primary' : 'border-transparent text-ink-secondary hover:text-ink-primary',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && t.count > 0 && <span className="rounded bg-bg-tertiary px-1.5 text-[11px]">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Read and write a set of query parameters, replacing history so filters do not flood the back button. */
export function useQueryState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(defaults);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = params.get(key);
      if (v !== null) (next as Record<string, string>)[key] = v;
    }
    setState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (patch: Partial<T>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v === defaults[k] || v === '') params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      return next;
    });
  };
  return [state, update];
}
