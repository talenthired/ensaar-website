'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Download,
  Loader2,
  MessageSquareWarning,
  Pencil,
  Printer,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import type { EorClient, EorDocument, VoidedSignature } from '@/lib/eor/store';
import type { PortalView } from '@/lib/eor/portal';
import type { OutboxEntry } from '@/lib/notify/outbox';
import {
  DOCUMENT_KINDS,
  EMPLOYEE_STEPS,
  INDIA_STATES,
  STATUS_LABELS,
  entityTypeLabel,
  formatDay,
  formatInr,
  formatUsd,
  todayInIndia,
  usStateName,
  type Errors,
} from '@/lib/eor/onboarding';
import { AgreementView } from '@/components/eor/AgreementView';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from './ClientsAdmin';

type Detail = {
  client: EorClient;
  view: PortalView;
  documents: EorDocument[];
  messages: OutboxEntry[];
  history: VoidedSignature[];
  emailConfigured: boolean;
  viewer: { email: string | null; bootstrap: boolean };
};

const input = 'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary';
const button =
  'inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary transition hover:bg-bg-tertiary disabled:opacity-60';

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

const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function ClientDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ link: string; emailConfigured: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [panel, setPanel] = useState<'changes' | 'attest' | 'edit' | null>(null);
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [hire, setHire] = useState<Record<string, string>>({});
  const [hireErrors, setHireErrors] = useState<Errors>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/basecamp/clients/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load.');
      setDetail(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(payload: Record<string, unknown>, label: string): Promise<boolean> {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(`/api/basecamp/clients/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.errors) setHireErrors(data.errors);
        throw new Error(data.error || 'Unable to do that.');
      }
      if (payload.action === 'resend') setLink({ link: data.link, emailConfigured: Boolean(data.emailConfigured) });
      await load();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to do that.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function retry(messageId: string) {
    setBusy(`retry:${messageId}`);
    try {
      const response = await fetch(`/api/basecamp/outbox/${messageId}`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to retry.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to retry.');
    } finally {
      setBusy(null);
    }
  }

  if (!detail) {
    return error ? (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    ) : (
      <p className="text-sm text-ink-secondary">Loading…</p>
    );
  }

  const { client, view, documents, messages, history } = detail;
  const company = client.company;
  const open = client.status !== 'approved' && client.status !== 'cancelled';
  const pastStart = client.startDate < todayInIndia();
  const verified = view.signatory.verified;
  const named = !detail.viewer.bootstrap;

  function startEdit() {
    setHire({
      companyName: client.companyName,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      employeeName: client.employeeName,
      employeeEmail: client.employeeEmail ?? '',
      jobTitle: client.jobTitle,
      salaryInr: String(client.salaryInr),
      startDate: client.startDate,
      workState: client.workState,
      monthlyFeeUsd: String(client.monthlyFeeUsd),
      notes: client.notes ?? '',
    });
    setHireErrors({});
    setPanel('edit');
  }

  async function approve() {
    let confirmPastStart = false;
    if (pastStart) {
      if (!window.confirm(`The start date (${formatDay(client.startDate)}) has passed. Approve with a backdated start? Otherwise cancel and edit the start date.`)) return;
      confirmPastStart = true;
    }
    if (!window.confirm('Approve and countersign for Ensaar? This binds Ensaar to the agreement and emails the executed copy.')) return;
    await act({ action: 'approve', confirmPastStart }, 'approve');
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link href="/basecamp/clients" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All clients
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">{company?.legalName ?? client.companyName}</h1>
            <p className="text-sm text-ink-secondary">
              {client.employeeName} · {client.jobTitle}
            </p>
          </div>
          <span className={cn('w-fit rounded px-2.5 py-1 text-xs font-medium', STATUS_STYLES[client.status])}>{STATUS_LABELS[client.status]}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {!named && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
          You are using the shared login. Reviewing, requesting changes and countersigning need your own account.
        </p>
      )}
      {client.status === 'changes_requested' && client.changesNote && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 print:hidden">
          Waiting on the customer: {client.changesNote}
        </p>
      )}
      {open && pastStart && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 print:hidden">
          The start date ({formatDay(client.startDate)}) has passed. Edit the hire to set a new date; the customer will be asked to re-sign.
        </p>
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        {client.status === 'signed' && (
          <button type="button" disabled={busy !== null || !named} onClick={() => void approve()} className={cn(button, 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700')}>
            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
            Approve and countersign
          </button>
        )}
        {open && (
          <>
            <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'changes' ? null : 'changes')} className={button}>
              <MessageSquareWarning className="h-4 w-4" aria-hidden /> Request changes
            </button>
            <button type="button" disabled={busy !== null || !named} onClick={() => (panel === 'edit' ? setPanel(null) : startEdit())} className={button}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit hire
            </button>
            {company && !verified && client.status !== 'signed' && (
              <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'attest' ? null : 'attest')} className={button}>
                <ShieldCheck className="h-4 w-4" aria-hidden /> Verify signatory
              </button>
            )}
          </>
        )}
        {client.status !== 'cancelled' && (
          <button type="button" disabled={busy !== null} onClick={() => void act({ action: 'resend' }, 'resend')} className={button}>
            {busy === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            New link and resend
          </button>
        )}
        {open && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => window.confirm('Cancel this onboarding? The customer link stops working.') && void act({ action: 'cancel' }, 'cancel')}
            className={cn(button, 'text-red-700')}
          >
            <XCircle className="h-4 w-4" aria-hidden /> Cancel onboarding
          </button>
        )}
      </div>

      {panel === 'changes' && (
        <form
          className="space-y-2 rounded-xl border border-line-subtle bg-bg-primary p-4 print:hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ action: 'request_changes', note }, 'changes')) {
              setPanel(null);
              setNote('');
            }
          }}
        >
          <label htmlFor="changes-note" className="block text-sm font-medium text-ink-primary">
            What should the customer change?
          </label>
          <textarea id="changes-note" className={cn(input, 'min-h-24')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the EIN letter is for a different company. Please upload the one for Pristinno Tech Inc." />
          <p className="text-xs text-ink-secondary">
            Rejected documents (below) are listed in the email automatically.{' '}
            {client.status === 'signed' ? 'Their signature will be voided (kept in history) and they will sign again.' : ''}
          </p>
          <button type="submit" disabled={busy !== null || note.trim().length < 5} className={button}>
            {busy === 'changes' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send to customer
          </button>
        </form>
      )}

      {panel === 'attest' && company && (
        <form
          className="space-y-2 rounded-xl border border-line-subtle bg-bg-primary p-4 print:hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ action: 'attest_signatory', note }, 'attest')) {
              setPanel(null);
              setNote('');
            }
          }}
        >
          <p className="text-sm text-ink-primary">
            Confirm that you verified <strong>{company.signatoryName}</strong> ({company.signatoryTitle}, {company.signatoryEmail}) is who they say
            and may sign for {company.legalName}. Your name and this note go into the signature evidence.
          </p>
          <label htmlFor="attest-note" className="block text-sm font-medium text-ink-primary">
            How did you verify them?
          </label>
          <input id="attest-note" className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Video call on 30 Sep, photo ID checked, confirmed CEO on company website" />
          <button type="submit" disabled={busy !== null || note.trim().length < 5} className={button}>
            {busy === 'attest' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Record verification
          </button>
        </form>
      )}

      {panel === 'edit' && (
        <form
          className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-4 print:hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            if (client.status === 'signed' && !window.confirm('The customer already signed. Changing the hire voids that signature (it stays in history) and asks them to sign again. Continue?')) return;
            if (await act({ action: 'update_hire', hire }, 'edit')) setPanel(null);
          }}
        >
          <p className="text-sm font-medium text-ink-primary">Edit hire details</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['companyName', 'Company name'],
                ['contactName', 'Contact name'],
                ['contactEmail', 'Contact email'],
                ['employeeName', 'Employee name'],
                ['employeeEmail', 'Employee email'],
                ['jobTitle', 'Job title'],
                ['salaryInr', 'Annual salary (INR)'],
                ['startDate', 'Start date'],
                ['monthlyFeeUsd', 'Fee (USD/month)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block text-ink-secondary">{label}</span>
                <input
                  className={input}
                  type={key === 'startDate' ? 'date' : 'text'}
                  aria-invalid={Boolean(hireErrors[key])}
                  value={hire[key] ?? ''}
                  onChange={(e) => setHire((h) => ({ ...h, [key]: e.target.value }))}
                />
                {hireErrors[key] && <span className="mt-1 block text-xs text-red-600">{hireErrors[key]}</span>}
              </label>
            ))}
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">Works from</span>
              <select className={input} value={hire.workState ?? ''} onChange={(e) => setHire((h) => ({ ...h, workState: e.target.value }))}>
                {INDIA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-secondary">Internal notes</span>
              <input className={input} value={hire.notes ?? ''} onChange={(e) => setHire((h) => ({ ...h, notes: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy !== null} className={button}>
              {busy === 'edit' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save changes
            </button>
            <button type="button" onClick={() => setPanel(null)} className="text-sm text-ink-secondary">
              Close
            </button>
          </div>
        </form>
      )}

      {link && (
        <div className="rounded-lg border border-line-subtle bg-bg-primary p-3 text-sm print:hidden">
          <p className="text-ink-primary">
            {link.emailConfigured ? `New link emailed to ${client.contactEmail}.` : `Email is not configured. Send this link to ${client.contactEmail}.`} The previous
            link no longer works.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input readOnly aria-label="Onboarding link" value={link.link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line-subtle bg-bg-secondary px-3 py-2 font-mono text-xs" />
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

      {client.employeeCase && (
        <section className="rounded-xl border border-emerald-200 bg-bg-primary p-5 print:hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">
                Employee onboarding ({Object.values(client.employeeCase.steps).filter(Boolean).length} of {EMPLOYEE_STEPS.length})
              </h2>
              <p className="text-xs text-ink-secondary">Start date {formatDay(client.employeeCase.dueDate)}. The customer sees this progress on their page.</p>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const owner = new FormData(e.currentTarget).get('owner');
                void act({ action: 'employee_owner', owner }, 'owner');
              }}
            >
              <label className="text-xs text-ink-secondary">
                Owner
                <input name="owner" defaultValue={client.employeeCase.owner ?? ''} className={cn(input, 'mt-1 w-64')} />
              </label>
              <button type="submit" disabled={busy !== null} className={button}>
                Save
              </button>
            </form>
          </div>
          <ul className="mt-3 space-y-2">
            {EMPLOYEE_STEPS.map((step) => {
              const done = client.employeeCase?.steps[step.key];
              return (
                <li key={step.key}>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={Boolean(done)}
                      disabled={busy !== null}
                      onChange={(e) => void act({ action: 'employee_step', step: step.key, done: e.target.checked }, `step:${step.key}`)}
                    />
                    <span>
                      <span className={done ? 'text-ink-primary' : 'text-ink-secondary'}>{step.label}</span>
                      {done && <span className="block text-xs text-ink-secondary">{done.doneBy}, {stamp(done.doneAt)}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
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
              <Row label="Registered address" value={[company.addressLine1, company.addressLine2, company.city, `${company.state} ${company.zip}`].filter(Boolean).join(', ')} />
              <Row label="Billing email" value={company.billingEmail} />
              <Row label="Signatory" value={`${company.signatoryName}, ${company.signatoryTitle}`} />
              <Row
                label="Signatory email"
                value={
                  <>
                    {company.signatoryEmail}{' '}
                    {verified ? (
                      <span className="text-xs text-emerald-700">
                        verified {client.signatoryVerifiedBy?.startsWith('staff_attested') ? 'by staff' : 'by email code'}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-700">not verified</span>
                    )}
                  </>
                }
              />
              <Row label="Declarations" value="Hire details confirmed · not sanctioned · employee will not conclude contracts" />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink-secondary">Not completed yet.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden">
        <h2 className="text-sm font-semibold text-ink-primary">Documents</h2>
        <p className="text-xs text-ink-secondary">Open each file and check it is the right company and the right document. Approval needs every required document accepted.</p>
        <ul className="mt-3 space-y-4">
          {DOCUMENT_KINDS.map((kind) => {
            const files = documents.filter((d) => d.kind === kind.kind);
            return (
              <li key={kind.kind} className="text-sm">
                <p className="text-ink-secondary">
                  {kind.label}
                  {kind.required && !files.some((f) => f.reviewStatus !== 'rejected') && <span className="ml-2 text-xs text-red-600">missing</span>}
                </p>
                {files.map((file) => (
                  <div key={file.id} className="mt-1 flex flex-col gap-2 rounded-lg border border-line-subtle p-2 sm:flex-row sm:items-center sm:justify-between">
                    <a href={`/api/basecamp/clients/${client.id}/documents/${file.id}`} className="inline-flex min-w-0 items-center gap-2 text-ink-primary underline-offset-2 hover:underline">
                      <Download className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{file.filename}</span>
                      <span className="shrink-0 text-xs text-ink-secondary">({size(file.sizeBytes)})</span>
                    </a>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs',
                          file.reviewStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700' : file.reviewStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-bg-tertiary text-ink-secondary',
                        )}
                        title={file.reviewNote ?? undefined}
                      >
                        {file.reviewStatus === 'pending' ? 'Not reviewed' : file.reviewStatus === 'accepted' ? `Accepted` : `Rejected: ${file.reviewNote}`}
                      </span>
                      {open && file.reviewStatus !== 'accepted' && (
                        <button type="button" disabled={busy !== null || !named} onClick={() => void act({ action: 'review_document', documentId: file.id, decision: 'accepted' }, `doc:${file.id}`)} className={cn(button, 'px-2 py-1 text-xs')}>
                          <Check className="h-3 w-3" aria-hidden /> Accept
                        </button>
                      )}
                      {open && file.reviewStatus !== 'rejected' && (
                        <button type="button" disabled={busy !== null || !named} onClick={() => setRejecting({ id: file.id, reason: '' })} className={cn(button, 'px-2 py-1 text-xs text-red-700')}>
                          <X className="h-3 w-3" aria-hidden /> Reject
                        </button>
                      )}
                    </div>
                    {rejecting?.id === file.id && (
                      <form
                        className="flex w-full flex-col gap-2 sm:flex-row"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (await act({ action: 'review_document', documentId: file.id, decision: 'rejected', note: rejecting.reason }, `doc:${file.id}`)) setRejecting(null);
                        }}
                      >
                        <input
                          autoFocus
                          aria-label="Reason the customer will see"
                          className={input}
                          placeholder="Reason the customer will see, e.g. this letter is for a different EIN"
                          value={rejecting.reason}
                          onChange={(e) => setRejecting({ id: file.id, reason: e.target.value })}
                        />
                        <button type="submit" disabled={rejecting.reason.trim().length < 3 || busy !== null} className={cn(button, 'text-red-700')}>
                          Reject
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
        {documents.some((d) => d.reviewStatus === 'rejected') && open && (
          <p className="mt-3 text-xs text-ink-secondary">Rejected a document? Use Request changes so the customer is told what to replace.</p>
        )}
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:border-0 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Agreement</h2>
            <p className="text-xs text-ink-secondary">
              {client.signedAt
                ? `Signed by ${client.signedName} (${client.signedTitle}, ${client.signedEmail}) on ${stamp(client.signedAt)} from ${client.signedIp ?? 'unrecorded address'}. Version ${client.agreementVersion}.`
                : view.readyToSign
                  ? 'Draft. The customer has not signed yet.'
                  : 'Draft. Signing is closed until the legal sign-off for this version is recorded (see Clients).'}
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
            <AgreementView agreement={view.agreement} signedText={client.signedAt ? view.agreementText : null} signature={view.signature} customerName={company?.legalName ?? client.companyName} />
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-4 print:hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Voided signatures (kept for the record)</h3>
            <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
              {history.map((h) => (
                <li key={h.id}>
                  {h.signedName} signed {stamp(h.signedAt)} (version {h.agreementVersion}, {h.agreementHash?.slice(0, 12)}…); voided {stamp(h.voidedAt)} by {h.voidedBy}: {h.voidReason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden">
        <h2 className="text-sm font-semibold text-ink-primary">Emails</h2>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate text-ink-primary">{m.subject}</span>
                  <span className="block truncate text-xs text-ink-secondary">
                    to {m.to.join(', ')} · {stamp(m.createdAt)} ·{' '}
                    <span className={m.status === 'sent' ? 'text-emerald-700' : m.status === 'pending' ? 'text-ink-secondary' : 'text-red-700'}>
                      {m.status === 'skipped' ? 'not sent (email not configured)' : m.status}
                    </span>
                    {m.lastError && m.status !== 'sent' ? ` · ${m.lastError}` : ''}
                  </span>
                </span>
                {(m.status === 'failed' || m.status === 'skipped') && detail.emailConfigured && (
                  <button type="button" disabled={busy !== null} onClick={() => void retry(m.id)} className={cn(button, 'px-2 py-1 text-xs')}>
                    {busy === `retry:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <RotateCw className="h-3 w-3" aria-hidden />}
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
