'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Copy, Loader2, MailWarning, RotateCw, Scale, Search, Send, ShieldAlert } from 'lucide-react';
import { EOR_PRICE_USD } from '@/lib/content/india';
import {
  INDIA_STATES,
  STATUS_LABELS,
  formatDay,
  formatInr,
  todayInIndia,
  validateHire,
  type ClientStatus,
  type Errors,
} from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';

type Client = {
  id: string;
  status: ClientStatus;
  companyName: string;
  contactName: string;
  contactEmail: string;
  employeeName: string;
  jobTitle: string;
  salaryInr: number;
  startDate: string;
  tokenExpiresAt: string;
  createdAt: string;
};

type Undelivered = { id: string; kind: string; to: string[]; subject: string; status: string; lastError: string | null; createdAt: string };
type Template = { version: string; approval: { reviewer: string; recordedBy: string; recordedAt: string } | null };

const input = 'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary';

export const STATUS_STYLES: Record<ClientStatus, string> = {
  invited: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-800',
  changes_requested: 'bg-orange-50 text-orange-800',
  signed: 'bg-violet-50 text-violet-700',
  approved: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-bg-tertiary text-ink-secondary',
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs_action', label: 'Needs action' },
  { key: 'signed', label: 'Awaiting review' },
  { key: 'changes_requested', label: 'Changes requested' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'invited', label: 'Invited' },
  { key: 'approved', label: 'Approved' },
  { key: 'cancelled', label: 'Cancelled' },
];

// The published EOR price; the field is editable for a negotiated deal.
const DEFAULT_FEE = String(EOR_PRICE_USD);

const EMPTY = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  employeeName: '',
  employeeEmail: '',
  jobTitle: '',
  salaryInr: '',
  startDate: '',
  workState: '',
  monthlyFeeUsd: DEFAULT_FEE,
  notes: '',
};

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '');

/** Why an onboarding needs someone's attention, if it does. */
function attention(client: Client): string | null {
  const today = todayInIndia();
  if (client.status === 'signed') return 'Review and countersign';
  if (client.status !== 'approved' && client.status !== 'cancelled' && client.startDate < today) return 'Start date passed';
  if (['invited', 'in_progress', 'changes_requested'].includes(client.status)) {
    const days = (Date.parse(client.tokenExpiresAt) - Date.now()) / 86_400_000;
    if (days < 5) return days < 0 ? 'Link expired' : 'Link expires soon';
  }
  return null;
}

export function ClientsAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [template, setTemplate] = useState<Template | null>(null);
  const [emailState, setEmailState] = useState<{ configured: boolean; undelivered: Undelivered[] } | null>(null);
  const [viewer, setViewer] = useState<{ role: string; bootstrap: boolean } | null>(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<{ link: string; emailConfigured: boolean; to: string } | null>(null);
  const [duplicate, setDuplicate] = useState<{ message: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const idempotencyKey = useRef(newKey());

  const load = useCallback(
    async (append = false, from: string | null = null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status });
        if (q.trim()) params.set('q', q.trim());
        if (append && from) params.set('cursor', from);
        const response = await fetch(`/api/basecamp/clients?${params}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load clients.');
        setClients((current) => (append ? [...current, ...(data.clients ?? [])] : data.clients ?? []));
        setCursor(data.nextCursor ?? null);
        setTemplate(data.template ?? null);
        setEmailState(data.email ?? null);
        setViewer(data.viewer ?? null);
        // Open the form when there is nothing else to show, but never close one
        // the admin opened while the list was still loading.
        if (!append && status === 'all' && !q && (data.clients ?? []).length === 0) setShowForm(true);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to load clients.');
      } finally {
        setLoading(false);
      }
    },
    [q, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, q]);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function invite(event: React.FormEvent | null, confirmDuplicate = false) {
    event?.preventDefault();
    setSent(null);
    setDuplicate(null);
    const check = validateHire(form);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setBusy('invite');
    try {
      const response = await fetch('/api/basecamp/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, idempotencyKey: idempotencyKey.current, confirmDuplicate }),
      });
      const data = await response.json();
      if (response.status === 409 && data.duplicate) {
        setDuplicate({ message: data.error, id: data.duplicate.id });
        return;
      }
      if (!response.ok) {
        setErrors(data.errors ?? {});
        throw new Error(data.error || 'Unable to invite.');
      }
      if (data.replayed) {
        setError('That onboarding was already created by an earlier attempt. Open it below to resend the link.');
      } else {
        setSent({ link: data.link, emailConfigured: Boolean(data.emailConfigured), to: form.contactEmail });
      }
      setForm(EMPTY);
      setErrors({});
      idempotencyKey.current = newKey();
      setShowForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to invite.');
    } finally {
      setBusy(null);
    }
  }

  async function retry(id: string) {
    setBusy(`retry:${id}`);
    try {
      const response = await fetch(`/api/basecamp/outbox/${id}`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to retry.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to retry.');
    } finally {
      setBusy(null);
    }
  }

  const field = (key: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-secondary">{label}</span>
      <input
        className={input}
        value={form[key]}
        aria-invalid={Boolean(errors[key])}
        onChange={(e) => set(key, e.target.value)}
        {...props}
      />
      {errors[key] ? (
        <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-secondary">{hint}</span>
      ) : null}
    </label>
  );

  const salary = Number(form.salaryInr.replace(/[,\s]/g, ''));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">EOR clients</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Invite a customer; they complete company details, upload documents, verify the signatory and sign from a private
            link. You review each document and countersign here.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary"
          >
            <Send className="h-4 w-4" aria-hidden /> New onboarding
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {template && !template.approval && <LegalGate template={template} canRecord={viewer?.role === 'owner' && !viewer.bootstrap} onDone={() => void load()} />}

      {emailState && (!emailState.configured || emailState.undelivered.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <MailWarning className="h-4 w-4" aria-hidden />
            {emailState.configured ? 'Some emails were not delivered' : 'Email is not configured'}
          </p>
          {!emailState.configured && (
            <p className="mt-1">
              Nothing is emailed automatically. Copy each onboarding link and send it yourself, and verify signatories by
              phone or video call.
            </p>
          )}
          {emailState.undelivered.length > 0 && (
            <ul className="mt-2 space-y-2">
              {emailState.undelivered.map((m) => (
                <li key={m.id} className="flex flex-col gap-1 rounded-lg bg-white/60 p-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.subject}</span>
                    <span className="block truncate text-xs">
                      to {m.to.join(', ')} · {m.status} · {m.lastError}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busy !== null || !emailState.configured}
                    onClick={() => void retry(m.id)}
                    className="inline-flex w-fit items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {busy === `retry:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <RotateCw className="h-3 w-3" aria-hidden />}
                    Retry
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {sent && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>
            {sent.emailConfigured
              ? `Onboarding link emailed to ${sent.to}. It is also here if you want to send it yourself.`
              : `Email is not configured, so send this link to ${sent.to} yourself. It works for 30 days and is shown only once.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              readOnly
              aria-label="Onboarding link"
              value={sent.link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 font-mono text-xs text-ink-primary"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(sent.link).catch(() => undefined);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="text-sm font-semibold text-ink-primary">New onboarding</h2>
          <form onSubmit={(e) => void invite(e)} noValidate className="mt-4 space-y-5">
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Customer</legend>
              {field('companyName', 'Company name', { placeholder: 'Pristinno Tech' })}
              {field('contactName', 'Contact name')}
              {field('contactEmail', 'Contact email', { type: 'email' }, 'The onboarding link goes here.')}
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Employee</legend>
              {field('employeeName', 'Employee full name')}
              {field('employeeEmail', 'Employee email', { type: 'email' }, 'Optional.')}
              {field('jobTitle', 'Job title', { placeholder: 'Senior Software Engineer' })}
              {field(
                'salaryInr',
                'Annual gross salary (INR)',
                { inputMode: 'numeric', placeholder: '1800000' },
                salary ? `${formatInr(salary)} a year` : 'Cost to company, before employer contributions.',
              )}
              {field('startDate', 'Start date', { type: 'date', min: todayInIndia() })}
              <label className="block text-sm">
                <span className="mb-1 block text-ink-secondary">Works from (state or territory)</span>
                <select className={input} value={form.workState} aria-invalid={Boolean(errors.workState)} onChange={(e) => set('workState', e.target.value)}>
                  <option value="">Choose…</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.workState && <span className="mt-1 block text-xs text-red-600">{errors.workState}</span>}
              </label>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Terms</legend>
              {field('monthlyFeeUsd', 'Ensaar fee (USD per month)', { inputMode: 'numeric' }, `Published price is $${EOR_PRICE_USD}.`)}
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-ink-secondary">Internal notes</span>
                <input className={input} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Not shown to the customer" />
              </label>
            </fieldset>

            {duplicate && (
              <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> {duplicate.message}
                </p>
                <p className="mt-1">
                  <Link href={`/basecamp/clients/${duplicate.id}`} className="underline">
                    Open the existing onboarding
                  </Link>{' '}
                  to resend its link, or create another only if this is a separate engagement.
                </p>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void invite(null, true)}
                  className="mt-2 rounded-lg border border-amber-400 px-3 py-1.5 text-sm"
                >
                  Create a separate onboarding anyway
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
              >
                {busy === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                Send onboarding link
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-secondary">
                Close
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block sm:w-80">
            <span className="sr-only">Search onboardings</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-secondary" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Company, employee or email"
              className={cn(input, 'pl-9')}
            />
          </label>
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={status === f.key}
                onClick={() => setStatus(f.key)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                  status === f.key ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && clients.length === 0 ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="rounded-lg border border-line-subtle bg-bg-primary px-4 py-6 text-sm text-ink-secondary">
            {q || status !== 'all' ? 'Nothing matches.' : 'No onboardings yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => {
              const flag = attention(client);
              return (
                <li key={client.id}>
                  <Link
                    href={`/basecamp/clients/${client.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line-subtle bg-bg-primary p-4 transition hover:bg-bg-tertiary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {client.companyName} <span className="text-ink-secondary">· {client.employeeName}</span>
                      </p>
                      <p className="truncate text-xs text-ink-secondary">
                        {client.jobTitle} · {formatInr(client.salaryInr)} · starts {formatDay(client.startDate)} · {client.contactEmail}
                      </p>
                      {flag && <p className="mt-1 text-xs font-medium text-orange-700">{flag}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_STYLES[client.status])}>{STATUS_LABELS[client.status]}</span>
                      <ChevronRight className="h-4 w-4 text-ink-secondary" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {cursor && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(true, cursor)}
            className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-4 py-2 text-sm text-ink-primary disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Load more
          </button>
        )}
      </section>
    </div>
  );
}

/** Signing stays closed until an owner records who reviewed this agreement version (GAP-06). */
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
        Have counsel review the agreement (open any onboarding and click Show under Agreement). Then an owner records the
        sign-off here. It is permanent for this version; a changed template gets a new version and a new review.
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
              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.error || 'Unable to record.');
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
            <input className={input} value={reviewer} onChange={(e) => setReviewer(e.target.value)} required minLength={3} />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-xs">Note (optional, e.g. reference or date of opinion)</span>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} />
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
