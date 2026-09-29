'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, Copy, Download, Loader2, Printer, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import type { EorClient } from '@/lib/eor/store';
import type { PortalView } from '@/lib/eor/portal';
import {
  DOCUMENT_KINDS,
  STATUS_LABELS,
  entityTypeLabel,
  formatDay,
  formatInr,
  formatUsd,
  usStateName,
} from '@/lib/eor/onboarding';
import { AgreementView } from '@/components/eor/AgreementView';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from './ClientsAdmin';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className="text-sm text-ink-primary">{value || '—'}</dd>
    </div>
  );
}

function size(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ClientDetail({ id }: { id: string }) {
  const [client, setClient] = useState<EorClient | null>(null);
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/basecamp/clients/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load.');
      setClient(data.client);
      setView(data.view);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: 'resend' | 'approve' | 'cancel') {
    if (action === 'cancel' && !window.confirm('Cancel this onboarding? The customer link stops working.')) return;
    if (
      action === 'approve' &&
      !window.confirm('Approve and countersign for Ensaar? Check the documents first: this signs the agreement.')
    )
      return;
    setBusy(action);
    try {
      const response = await fetch(`/api/basecamp/clients/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to do that.');
      if (action === 'resend') setLink({ link: data.link, emailed: Boolean(data.emailed) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to do that.');
    } finally {
      setBusy(null);
    }
  }

  if (!client || !view) {
    return error ? (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    ) : (
      <p className="text-sm text-ink-secondary">Loading…</p>
    );
  }

  const company = client.company;
  const button =
    'inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary transition hover:bg-bg-tertiary disabled:opacity-60';

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link href="/basecamp/clients" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All clients
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">
              {company?.legalName ?? client.companyName}
            </h1>
            <p className="text-sm text-ink-secondary">
              {client.employeeName} · {client.jobTitle}
            </p>
          </div>
          <span className={cn('w-fit rounded px-2.5 py-1 text-xs font-medium', STATUS_STYLES[client.status])}>
            {STATUS_LABELS[client.status]}
          </span>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        {client.status === 'signed' && (
          <button type="button" disabled={busy !== null} onClick={() => void act('approve')} className={cn(button, 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700')}>
            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
            Approve and countersign
          </button>
        )}
        {client.status !== 'cancelled' && (
          <button type="button" disabled={busy !== null} onClick={() => void act('resend')} className={button}>
            {busy === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            New link and resend
          </button>
        )}
        {client.status !== 'cancelled' && client.status !== 'approved' && (
          <button type="button" disabled={busy !== null} onClick={() => void act('cancel')} className={cn(button, 'text-red-700')}>
            <XCircle className="h-4 w-4" aria-hidden /> Cancel onboarding
          </button>
        )}
      </div>

      {link && (
        <div className="rounded-lg border border-line-subtle bg-bg-primary p-3 text-sm print:hidden">
          <p className="text-ink-primary">
            {link.emailed ? `New link emailed to ${client.contactEmail}.` : `Email is not configured. Send this link to ${client.contactEmail}.`}{' '}
            The previous link no longer works.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input readOnly value={link.link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line-subtle bg-bg-secondary px-3 py-2 font-mono text-xs" />
            <button
              type="button"
              className={button}
              onClick={async () => {
                await navigator.clipboard.writeText(link.link).catch(() => undefined);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 print:hidden">
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Hire (entered by Ensaar)</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Row label="Employee" value={client.employeeName} />
            <Row label="Employee email" value={client.employeeEmail} />
            <Row label="Job title" value={client.jobTitle} />
            <Row label="Works from" value={`${client.workState}, India`} />
            <Row label="Annual gross salary" value={formatInr(client.salaryInr)} />
            <Row label="Start date" value={formatDay(client.startDate)} />
            <Row label="Ensaar fee" value={`${formatUsd(client.monthlyFeeUsd)} a month`} />
            <Row label="Contact" value={`${client.contactName} · ${client.contactEmail}`} />
            <Row label="Invited" value={formatDay(client.createdAt)} />
            <Row label="Link valid until" value={client.status === 'cancelled' ? 'Cancelled' : formatDay(client.tokenExpiresAt)} />
          </dl>
          {client.notes && <p className="mt-4 rounded-lg bg-bg-secondary p-3 text-sm text-ink-secondary">{client.notes}</p>}
        </section>

        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Company (from the customer)</h2>
          {company ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Row label="Legal name" value={company.legalName} />
              <Row label="Entity" value={`${entityTypeLabel(company.entityType)}, ${usStateName(company.incorporationState)}`} />
              <Row label="EIN" value={company.ein} />
              <Row label="Website" value={company.website} />
              <Row
                label="Registered address"
                value={[company.addressLine1, company.addressLine2, company.city, `${company.state} ${company.zip}`].filter(Boolean).join(', ')}
              />
              <Row label="Billing email" value={company.billingEmail} />
              <Row label="Signatory" value={`${company.signatoryName}, ${company.signatoryTitle}`} />
              <Row label="Signatory email" value={company.signatoryEmail} />
              <Row
                label="Declarations"
                value="Hire details confirmed · not sanctioned · employee will not conclude contracts"
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink-secondary">Not completed yet.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden">
        <h2 className="text-sm font-semibold text-ink-primary">Documents</h2>
        <ul className="mt-3 space-y-2">
          {DOCUMENT_KINDS.map((kind) => {
            const files = view.documents.filter((d) => d.kind === kind.kind);
            return (
              <li key={kind.kind} className="text-sm">
                <p className="text-ink-secondary">
                  {kind.label}
                  {kind.required && files.length === 0 && <span className="ml-2 text-xs text-red-600">missing</span>}
                </p>
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/basecamp/clients/${client.id}/documents/${file.id}`}
                    className="mt-1 inline-flex items-center gap-2 text-ink-primary underline-offset-2 hover:underline"
                  >
                    <Download className="h-4 w-4" aria-hidden /> {file.filename}{' '}
                    <span className="text-xs text-ink-secondary">({size(file.sizeBytes)})</span>
                  </a>
                ))}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:border-0 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Agreement</h2>
            <p className="text-xs text-ink-secondary">
              {client.signedAt
                ? `Signed by ${client.signedName} (${client.signedTitle}) on ${new Date(client.signedAt).toUTCString()} from ${client.signedIp ?? 'unknown IP'}. Version ${client.agreementVersion}.`
                : 'Draft. The customer has not signed yet.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={button} onClick={() => setShowAgreement((v) => !v)}>
              {showAgreement ? 'Hide' : 'Show'}
            </button>
            {showAgreement && (
              <button type="button" className={button} onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden /> Print
              </button>
            )}
          </div>
        </div>
        {showAgreement && (
          <div className="mt-4 print:mt-0">
            <AgreementView
              agreement={view.agreement}
              signedText={client.signedAt ? view.agreementText : null}
              signature={view.signature}
              customerName={company?.legalName ?? client.companyName}
            />
          </div>
        )}
      </section>
    </div>
  );
}
