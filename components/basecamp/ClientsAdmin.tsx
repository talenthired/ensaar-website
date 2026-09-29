'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, Copy, Loader2, Send, ShieldAlert } from 'lucide-react';
import {
  INDIA_STATES,
  STATUS_LABELS,
  formatDay,
  formatInr,
  validateHire,
  type ClientStatus,
  type Errors,
} from '@/lib/eor/onboarding';
import { EOR_PRICE_USD } from '@/lib/content/india';
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
  createdAt: string;
};

const input = 'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary';

export const STATUS_STYLES: Record<ClientStatus, string> = {
  invited: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-800',
  signed: 'bg-violet-50 text-violet-700',
  approved: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-bg-tertiary text-ink-secondary',
};

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

export function ClientsAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ link: string; emailed: boolean; to: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/basecamp/clients', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load clients.');
      setClients(data.clients ?? []);
      // Open the form when there is nothing else to show, but never close one the
      // admin opened while the list was still loading.
      if ((data.clients ?? []).length === 0) setShowForm(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setSent(null);
    const check = validateHire(form);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/basecamp/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? {});
        throw new Error(data.error || 'Unable to invite.');
      }
      setSent({ link: data.link, emailed: Boolean(data.emailed), to: form.contactEmail });
      setForm(EMPTY);
      setErrors({});
      setError(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to invite.');
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-secondary">{label}</span>
      <input className={input} value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
      {errors[key] ? (
        <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-secondary">{hint}</span>
      ) : null}
    </label>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">EOR clients</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Invite a customer, and they complete company details, upload documents and sign the agreement from a
            private link. You review and countersign here.
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
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {sent && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>
            {sent.emailed
              ? `Onboarding link emailed to ${sent.to}. It is also here if you want to send it yourself.`
              : `Email is not configured, so send this link to ${sent.to} yourself. It works for 30 days and is shown only once.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              readOnly
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
          <form onSubmit={invite} noValidate className="mt-4 space-y-5">
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
              {field('salaryInr', 'Annual gross salary (INR)', { inputMode: 'numeric', placeholder: '1800000' }, form.salaryInr && Number(form.salaryInr.replace(/[,\s]/g, '')) ? formatInr(Number(form.salaryInr.replace(/[,\s]/g, ''))) + ' a year' : 'Cost to company, before employer contributions.')}
              {field('startDate', 'Start date', { type: 'date' })}
              <label className="block text-sm">
                <span className="mb-1 block text-ink-secondary">Works from (state)</span>
                <select className={input} value={form.workState} onChange={(e) => set('workState', e.target.value)}>
                  <option value="">Choose…</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
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
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                Send onboarding link
              </button>
              {clients.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink-primary">
          Onboardings {clients.length > 0 && <span className="text-ink-secondary">({clients.length})</span>}
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-ink-secondary">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line-subtle bg-bg-primary px-4 py-6 text-sm text-ink-secondary">
            No onboardings yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {clients.map((client) => (
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
                      {client.jobTitle} · {formatInr(client.salaryInr)} · starts {formatDay(client.startDate)} ·{' '}
                      {client.contactEmail}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_STYLES[client.status])}>
                      {STATUS_LABELS[client.status]}
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-secondary" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
