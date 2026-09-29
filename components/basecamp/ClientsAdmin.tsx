'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Building2, ChevronRight, Loader2, MailWarning, Plus, RotateCw, Scale } from 'lucide-react';
import { EOR_PRICE_USD } from '@/lib/content/india';
import { COMPANY_STATUS_LABELS, formatUsd, validateCompanyInvite, type CompanyStatus, type Errors } from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';
import {
  Badge,
  EmptyState,
  FilterChips,
  Notice,
  Pagination,
  STATUS_TONE,
  SearchBox,
  buttonClass,
  inputClass,
  primaryButtonClass,
  useQueryState,
} from '@/components/eor/ui';

type Counts = { total: number; draft: number; awaitingSignature: number; toCountersign: number; onboarding: number; active: number; exited: number };
type Company = {
  id: string;
  status: CompanyStatus;
  companyName: string;
  contactName: string;
  contactEmail: string;
  defaultFeeUsd: number;
  company: { legalName: string } | null;
  createdAt: string;
  counts: Counts;
  documentsToReview: number;
};
type Undelivered = { id: string; to: string[]; subject: string; status: string; lastError: string | null };
type Template = { version: string; approval: { reviewer: string } | null };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'needs_action', label: 'Needs action' },
  { key: 'setting_up', label: 'Setting up' },
  { key: 'active', label: 'Active' },
  { key: 'cancelled', label: 'Cancelled' },
];

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '');

/** What Ensaar owes this client right now, in a few words. */
function owed(c: Company): string[] {
  const out: string[] = [];
  if (c.status === 'signed') out.push('Countersign agreement');
  if (c.counts.toCountersign) out.push(`Countersign ${c.counts.toCountersign}`);
  if (c.documentsToReview && ['onboarding', 'changes_requested', 'signed'].includes(c.status)) out.push(`Review ${c.documentsToReview} document${c.documentsToReview === 1 ? '' : 's'}`);
  if (c.counts.draft) out.push(`${c.counts.draft} draft${c.counts.draft === 1 ? '' : 's'} to send`);
  return out;
}

export function ClientsAdmin() {
  const [query, setQuery] = useQueryState({ q: '', filter: 'all', page: '1' });
  const [data, setData] = useState<{ items: Company[]; total: number; page: number; pageSize: number } | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [emailState, setEmailState] = useState<{ configured: boolean; undelivered: Undelivered[] } | null>(null);
  const [viewer, setViewer] = useState<{ role: string; bootstrap: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query.q, filter: query.filter, page: query.page });
      const response = await fetch(`/api/basecamp/clients?${params}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load clients.');
      setData(json);
      setTemplate(json.template);
      setEmailState(json.email);
      setViewer(json.viewer);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load clients.');
    } finally {
      setLoading(false);
    }
  }, [query.q, query.filter, query.page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(id: string) {
    setBusy(`retry:${id}`);
    const response = await fetch(`/api/basecamp/outbox/${id}`, { method: 'POST' });
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Unable to retry.');
    setBusy(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Clients</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Each client is a company, verified once, with its own employees. Open a client to add or import employees.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 whitespace-nowrap">
          <Link href="/basecamp/employees" className={buttonClass}>
            All employees
          </Link>
          <button type="button" onClick={() => setShowForm((v) => !v)} className={primaryButtonClass}>
            <Plus className="h-4 w-4" aria-hidden /> New client
          </button>
        </div>
      </header>

      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      {template && !template.approval && <LegalGate template={template} canRecord={viewer?.role === 'owner' && !viewer.bootstrap} onDone={() => void load()} />}
      {emailState && (!emailState.configured || emailState.undelivered.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <MailWarning className="h-4 w-4" aria-hidden />
            {emailState.configured ? 'Some emails were not delivered' : 'Email is not configured'}
          </p>
          {!emailState.configured && <p className="mt-1">Customers cannot receive sign-in links until email is configured.</p>}
          {emailState.undelivered.length > 0 && (
            <ul className="mt-2 space-y-2">
              {emailState.undelivered.slice(0, 5).map((m) => (
                <li key={m.id} className="flex flex-col gap-1 rounded-lg bg-white/60 p-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.subject}</span>
                    <span className="block truncate text-xs">
                      to {m.to.join(', ')} · {m.status} · {m.lastError}
                    </span>
                  </span>
                  <button type="button" disabled={busy !== null || !emailState.configured} onClick={() => void retry(m.id)} className={cn(buttonClass, 'w-fit px-2 py-1 text-xs')}>
                    {busy === `retry:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <RotateCw className="h-3 w-3" aria-hidden />}
                    Retry
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showForm && <NewClientForm onCreated={(id) => (window.location.href = `/basecamp/clients/${id}`)} onClose={() => setShowForm(false)} />}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchBox label="Search clients" placeholder="Company, contact email or employee" value={query.q} onChange={(q) => setQuery({ q, page: '1' })} />
          <FilterChips label="Filter clients" options={FILTERS} value={query.filter} onChange={(filter) => setQuery({ filter, page: '1' })} />
        </div>

        {!data && loading ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={query.q || query.filter !== 'all' ? 'No clients match.' : 'No clients yet.'}>
            {!query.q && query.filter === 'all' && 'Create the first client with New client.'}
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line-subtle bg-bg-primary">
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-line-subtle bg-bg-secondary text-xs uppercase tracking-wide text-ink-secondary md:table-header-group">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Active</th>
                  <th className="px-4 py-2.5 text-right font-medium">Onboarding</th>
                  <th className="px-4 py-2.5 text-right font-medium">Awaiting signature</th>
                  <th className="px-4 py-2.5 font-medium">Ensaar to do</th>
                  <th className="px-2 py-2.5" aria-label="Open" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {data.items.map((c) => {
                  const todo = owed(c);
                  return (
                    <tr key={c.id} className="group relative block cursor-pointer hover:bg-bg-secondary md:table-row">
                      <td className="block px-4 pt-3 md:table-cell md:py-3">
                        <Link href={`/basecamp/clients/${c.id}`} className="font-medium text-ink-primary after:absolute after:inset-0">
                          {c.company?.legalName ?? c.companyName}
                        </Link>
                        <span className="block text-xs text-ink-secondary">
                          {c.contactName} · {c.contactEmail} · {formatUsd(c.defaultFeeUsd)}/mo
                        </span>
                      </td>
                      <td className="block px-4 py-1 md:table-cell md:py-3">
                        <Badge tone={STATUS_TONE[c.status]}>{COMPANY_STATUS_LABELS[c.status]}</Badge>
                      </td>
                      <td className="inline-block px-4 text-xs text-ink-secondary md:table-cell md:py-3 md:text-right md:text-sm md:text-ink-primary">
                        <span className="md:hidden">Active </span>
                        {c.counts.active}
                      </td>
                      <td className="inline-block px-4 text-xs text-ink-secondary md:table-cell md:py-3 md:text-right md:text-sm md:text-ink-primary">
                        <span className="md:hidden">Onboarding </span>
                        {c.counts.onboarding}
                      </td>
                      <td className="inline-block px-4 text-xs text-ink-secondary md:table-cell md:py-3 md:text-right md:text-sm md:text-ink-primary">
                        <span className="md:hidden">Awaiting signature </span>
                        {c.counts.awaitingSignature}
                      </td>
                      <td className="block px-4 pb-3 md:table-cell md:py-3">
                        {todo.length ? (
                          <span className="flex flex-wrap gap-1">
                            {todo.map((t) => (
                              <Badge key={t} tone="attention">
                                {t}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-secondary">Nothing</span>
                        )}
                      </td>
                      <td className="hidden px-2 md:table-cell">
                        <ChevronRight className="h-4 w-4 text-ink-secondary" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setQuery({ page: String(p) })} />}
      </section>
    </div>
  );
}

function NewClientForm({ onCreated, onClose }: { onCreated: (id: string) => void; onClose: () => void }) {
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', defaultFeeUsd: String(EOR_PRICE_USD), notes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ message: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(confirmDuplicate = false) {
    setError(null);
    setDuplicate(null);
    const check = validateCompanyInvite(form);
    if (!check.ok) return setErrors(check.errors);
    setBusy(true);
    try {
      const response = await fetch('/api/basecamp/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, idempotencyKey: key.current, confirmDuplicate }),
      });
      const json = await response.json();
      if (response.status === 409 && json.duplicate) return setDuplicate({ message: json.error, id: json.duplicate.id });
      if (!response.ok) {
        setErrors(json.errors ?? {});
        throw new Error(json.error || 'Unable to create the client.');
      }
      onCreated(json.company.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the client.');
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-secondary">{label}</span>
      <input className={inputClass} value={form[k]} aria-invalid={Boolean(errors[k])} onChange={(e) => set(k, e.target.value)} {...props} />
      {errors[k] ? <span className="mt-1 block text-xs text-red-600">{errors[k]}</span> : hint ? <span className="mt-1 block text-xs text-ink-secondary">{hint}</span> : null}
    </label>
  );

  return (
    <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
        <Building2 className="h-4 w-4" aria-hidden /> New client
      </h2>
      <p className="mt-1 text-xs text-ink-secondary">
        The contact gets a portal invitation to add company details and documents. You add employees on the client&apos;s page.
      </p>
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {field('companyName', 'Company name', { placeholder: 'Pristinno Tech' })}
          {field('contactName', 'Contact name')}
          {field('contactEmail', 'Contact email', { type: 'email' }, 'Receives the portal invitation.')}
          {field('defaultFeeUsd', 'Default fee (USD per employee per month)', { inputMode: 'numeric' }, `Published price is $${EOR_PRICE_USD}. Each hire can differ.`)}
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-ink-secondary">Internal notes</span>
            <input className={inputClass} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Not shown to the customer" />
          </label>
        </div>
        {duplicate && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden /> {duplicate.message}
            </p>
            <p className="mt-1">
              <Link href={`/basecamp/clients/${duplicate.id}`} className="underline">
                Open that client
              </Link>{' '}
              or create a separate one only if it is a different legal entity.
            </p>
            <button type="button" disabled={busy} onClick={() => void submit(true)} className={cn(buttonClass, 'mt-2')}>
              Create a separate client anyway
            </button>
          </div>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Create and invite
          </button>
          <button type="button" onClick={onClose} className="text-sm text-ink-secondary">
            Close
          </button>
        </div>
      </form>
    </section>
  );
}

/** Signing stays closed until an owner records who reviewed this agreement version. */
function LegalGate({ template, canRecord, onDone }: { template: Template; canRecord: boolean; onDone: () => void }) {
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <Scale className="h-4 w-4" aria-hidden /> Customers cannot sign yet: agreement version {template.version} has no recorded legal review
      </p>
      <p className="mt-1">
        This covers the master agreement and the per-employee Schedule A. Have counsel review both (open a client, then the
        Agreement tab), then an owner records the sign-off here. It is permanent for this version.
      </p>
      {canRecord ? (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!window.confirm(`Record that ${reviewer} approved agreement version ${template.version}? Customers will be able to sign it.`)) return;
            setBusy(true);
            setError(null);
            try {
              const response = await fetch('/api/basecamp/clients/template', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ reviewer, note, version: template.version }),
              });
              const json = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(json.error || 'Unable to record.');
              onDone();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Unable to record.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block flex-1">
            <span className="mb-1 block text-xs">Reviewed by (lawyer or firm)</span>
            <input className={inputClass} value={reviewer} onChange={(e) => setReviewer(e.target.value)} required minLength={3} />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-xs">Note (optional)</span>
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" disabled={busy || reviewer.trim().length < 3} className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? 'Recording…' : 'Record legal sign-off'}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-xs">Only an owner signed in with their own account can record the sign-off.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
