'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Check, Loader2, Plus, RotateCcw, XCircle } from 'lucide-react';
import {
  INVOICE_DAY,
  LATE_INTEREST_PERCENT_PER_MONTH,
  PAYMENT_DAYS,
  REMIND_DAYS_BEFORE,
  addDays,
  daysBetween,
  formatPeriod,
  formatUsdExact,
  validateInvoice,
} from '@/lib/eor/billing';
import type { InvoiceState } from '@/lib/eor/invoices';
import { formatDay, type Errors } from '@/lib/eor/onboarding';
import { Badge, EmptyState, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Data = { invoices: InvoiceState[]; defaults: { issuedOn: string; dueOn: string; period: string }; today: string; emailConfigured: boolean };

/** Where an invoice stands, in a few words. */
export function invoiceBadge(invoice: Pick<InvoiceState, 'status' | 'dueOn' | 'daysOverdue' | 'paidOn'>, today: string) {
  if (invoice.status === 'paid') return <Badge tone="good">Paid {invoice.paidOn ? formatDay(invoice.paidOn) : ''}</Badge>;
  if (invoice.status === 'void') return <Badge tone="neutral">Void</Badge>;
  if (invoice.daysOverdue > 0) return <Badge tone="bad">Overdue {invoice.daysOverdue} day{invoice.daysOverdue === 1 ? '' : 's'}</Badge>;
  const left = daysBetween(today, invoice.dueOn);
  return <Badge tone={left <= REMIND_DAYS_BEFORE ? 'warn' : 'info'}>{left === 0 ? 'Due today' : `Due in ${left} day${left === 1 ? '' : 's'}`}</Badge>;
}

/**
 * A client's invoices. Recording one emails the customer and starts the
 * reminders (before the due date, on it, and while it is late); marking it
 * paid stops them.
 */
export function ClientInvoices({ companyId, active, named, onMessage }: { companyId: string; active: boolean; named: boolean; onMessage: (kind: 'ok' | 'error', text: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/basecamp/clients/${companyId}/invoices`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return onMessage('error', json.error || 'Unable to load invoices.');
    setData(json);
  }, [companyId, onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(invoice: InvoiceState, body: Record<string, unknown>, success: string) {
    setBusy(`${body.action}:${invoice.id}`);
    try {
      const response = await fetch(`/api/basecamp/clients/${companyId}/invoices/${invoice.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Unable to do that.');
      onMessage('ok', success);
      await load();
    } catch (cause) {
      onMessage('error', cause instanceof Error ? cause.message : 'Unable to do that.');
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const small = cn(buttonClass, 'px-2 py-1 text-xs');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl text-xs text-ink-secondary">
          Invoices are dated the {INVOICE_DAY}th and payable within {PAYMENT_DAYS} days. Record each one here when you send it: the customer is
          emailed now, reminded {REMIND_DAYS_BEFORE} days before it is due and on the due date, and sent overdue notices (1, 3 and 7 days late, then
          weekly) until you mark it paid. Overdue amounts carry {LATE_INTEREST_PERCENT_PER_MONTH}% interest a month.
          {!data.emailConfigured && ' Email is not configured, so nothing will be sent.'}
        </p>
        {active && named && (
          <button type="button" className={cn(primaryButtonClass, 'shrink-0 whitespace-nowrap')} onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden /> Record invoice
          </button>
        )}
      </div>
      {!active && <p className="text-xs text-ink-secondary">Invoices can be recorded once the agreement is countersigned and the client is active.</p>}

      {showForm && (
        <InvoiceForm
          companyId={companyId}
          defaults={data.defaults}
          onCreated={async (number) => {
            setShowForm(false);
            onMessage('ok', `Invoice ${number} recorded and the customer emailed. Reminders are now scheduled.`);
            await load();
          }}
          onError={(text) => onMessage('error', text)}
        />
      )}

      {data.invoices.length === 0 ? (
        <EmptyState title="No invoices recorded yet.">Record an invoice when you send it, so the customer is reminded to pay on time.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line-subtle bg-bg-primary">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line-subtle bg-bg-secondary text-xs uppercase tracking-wide text-ink-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Issued</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {data.invoices.map((invoice) => (
                <tr key={invoice.id} className={cn(invoice.status === 'void' && 'text-ink-secondary line-through decoration-ink-secondary/40')}>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink-primary">{invoice.number}</span>
                    <span className="block text-xs text-ink-secondary">
                      {formatPeriod(invoice.period)}
                      {invoice.summary ? ` · ${invoice.summary}` : ''}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatUsdExact(invoice.amountUsd)}
                    {invoice.interestUsd > 0 && <span className="block text-xs text-red-700">+ {formatUsdExact(invoice.interestUsd)} interest</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDay(invoice.issuedOn)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDay(invoice.dueOn)}</td>
                  <td className="px-4 py-3 no-underline">{invoiceBadge(invoice, data.today)}</td>
                  <td className="px-4 py-3">
                    {named && (
                      <span className="flex flex-wrap justify-end gap-2">
                        {invoice.status === 'open' && (
                          <>
                            <button type="button" disabled={busy !== null} className={cn(small, 'text-emerald-700')} onClick={() => window.confirm(`Mark invoice ${invoice.number} as paid today? The customer is emailed a receipt and reminders stop.`) && void act(invoice, { action: 'paid' }, `Invoice ${invoice.number} marked paid.`)}>
                              {busy === `paid:${invoice.id}` ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Check className="h-3 w-3" aria-hidden />} Mark paid
                            </button>
                            <button type="button" disabled={busy !== null} className={small} onClick={() => window.confirm(`Email a reminder for invoice ${invoice.number} now?`) && void act(invoice, { action: 'remind' }, `Reminder for ${invoice.number} sent.`)}>
                              {busy === `remind:${invoice.id}` ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <BellRing className="h-3 w-3" aria-hidden />} Remind now
                            </button>
                            <button type="button" disabled={busy !== null} className={cn(small, 'text-red-700')} onClick={() => window.confirm(`Void invoice ${invoice.number}? Reminders stop. The customer is not emailed.`) && void act(invoice, { action: 'void' }, `Invoice ${invoice.number} voided.`)}>
                              <XCircle className="h-3 w-3" aria-hidden /> Void
                            </button>
                          </>
                        )}
                        {invoice.status !== 'open' && (
                          <button type="button" disabled={busy !== null} className={small} onClick={() => window.confirm(`Reopen invoice ${invoice.number}? Reminders resume.`) && void act(invoice, { action: 'reopen' }, `Invoice ${invoice.number} reopened.`)}>
                            <RotateCcw className="h-3 w-3" aria-hidden /> Reopen
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvoiceForm({ companyId, defaults, onCreated, onError }: { companyId: string; defaults: Data['defaults']; onCreated: (number: string) => void; onError: (text: string) => void }) {
  const [form, setForm] = useState({ number: '', period: defaults.period, amountUsd: '', issuedOn: defaults.issuedOn, dueOn: defaults.dueOn, summary: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const check = validateInvoice(form);
    if (!check.ok) return setErrors(check.errors);
    setBusy(true);
    try {
      const response = await fetch(`/api/basecamp/clients/${companyId}/invoices`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(json.errors ?? {});
        if (!json.errors) onError(json.error || 'Unable to record that invoice.');
        return;
      }
      onCreated(json.invoice.number);
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-secondary">{label}</span>
      <input id={`inv-${k}`} className={inputClass} value={form[k]} aria-invalid={Boolean(errors[k])} onChange={(e) => set(k, e.target.value)} {...props} />
      {errors[k] ? <span className="mt-1 block text-xs text-red-600">{errors[k]}</span> : hint ? <span className="mt-1 block text-xs text-ink-secondary">{hint}</span> : null}
    </label>
  );

  return (
    <form noValidate onSubmit={submit} className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {field('number', 'Invoice number', { placeholder: 'ENS-2026-101' }, 'As printed on the invoice.')}
        {field('period', 'Month covered', { type: 'month' })}
        {field('amountUsd', 'Total (US dollars)', { inputMode: 'decimal', placeholder: '4250.00' })}
        {field('issuedOn', 'Invoice date', {
          type: 'date',
          // The due date follows the invoice date until someone sets it by hand.
          onChange: (e) => setForm((f) => ({ ...f, issuedOn: e.target.value, dueOn: f.dueOn === addDays(f.issuedOn || defaults.issuedOn, PAYMENT_DAYS) && e.target.value ? addDays(e.target.value, PAYMENT_DAYS) : f.dueOn })),
        }, `Normally the ${INVOICE_DAY}th.`)}
        {field('dueOn', 'Due date', { type: 'date' }, `${PAYMENT_DAYS} days after the invoice date.`)}
        {field('summary', 'What it is for (optional)', { placeholder: '3 employees: fees, salaries, statutory' }, 'The customer sees this.')}
      </div>
      <button type="submit" disabled={busy} className={primaryButtonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Record and email the customer
      </button>
    </form>
  );
}
