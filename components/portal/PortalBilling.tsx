'use client';

import { useEffect, useState } from 'react';
import { INVOICE_DAY, LATE_INTEREST_PERCENT_PER_MONTH, PAYMENT_DAYS, billingNow, daysBetween, formatPeriod, formatUsdExact } from '@/lib/eor/billing';
import type { InvoiceView } from '@/lib/eor/invoices';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, EmptyState, Notice } from '@/components/eor/ui';
import { apiError, type Say } from './CompanySetup';

/** The customer's invoices: what is due and when, what is late, what is paid. */
export function PortalBilling({ say }: { say: Say }) {
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/portal/invoices', { cache: 'no-store' });
      if (!response.ok) return say('error', await apiError(response, 'Unable to load your invoices.'));
      setInvoices((await response.json()).invoices);
    })();
  }, [say]);

  if (!invoices) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const { today } = billingNow();
  const overdue = invoices.filter((i) => i.daysOverdue > 0);

  return (
    <section className="space-y-4">
      <p className="text-sm text-ink-secondary">
        Ensaar invoices on the {INVOICE_DAY}th of each month, payable by bank transfer within {PAYMENT_DAYS} days. That payment funds your
        employees&apos; salaries and statutory dues. Overdue amounts carry {LATE_INTEREST_PERCENT_PER_MONTH}% interest a month.
      </p>
      {overdue.length > 0 && (
        <Notice kind="error">
          {overdue.length === 1 ? `Invoice ${overdue[0]!.number} is overdue.` : `${overdue.length} invoices are overdue.`} Interest is accruing at{' '}
          {LATE_INTEREST_PERCENT_PER_MONTH}% a month. Please pay now to keep your service with Ensaar in good standing.
        </Notice>
      )}
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet.">Your first invoice appears here on the {INVOICE_DAY}th of the month your first employee starts.</EmptyState>
      ) : (
        <ul className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-bg-primary">
          {invoices.map((invoice) => {
            const left = daysBetween(today, invoice.dueOn);
            return (
              <li key={invoice.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block font-medium text-ink-primary">
                    {invoice.number} · {formatUsdExact(invoice.amountUsd)}
                  </span>
                  <span className="block text-xs text-ink-secondary">
                    {formatPeriod(invoice.period)}
                    {invoice.summary ? ` · ${invoice.summary}` : ''} · issued {formatDay(invoice.issuedOn)} · due {formatDay(invoice.dueOn)}
                  </span>
                  {invoice.interestUsd > 0 && <span className="block text-xs text-red-700">{formatUsdExact(invoice.interestUsd)} interest accrued so far</span>}
                </span>
                <span className="shrink-0">
                  {invoice.status === 'paid' ? (
                    <Badge tone="good">Paid {invoice.paidOn ? formatDay(invoice.paidOn) : ''}</Badge>
                  ) : invoice.daysOverdue > 0 ? (
                    <Badge tone="bad">Overdue {invoice.daysOverdue} day{invoice.daysOverdue === 1 ? '' : 's'}</Badge>
                  ) : (
                    <Badge tone={left <= 3 ? 'warn' : 'info'}>{left === 0 ? 'Due today' : `Due in ${left} day${left === 1 ? '' : 's'}`}</Badge>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
