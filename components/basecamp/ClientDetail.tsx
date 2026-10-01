'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, Copy, Download, Loader2, MessageSquareWarning, Pencil, Printer, RotateCw, Send, Trash2, UserPlus, X, XCircle } from 'lucide-react';
import type { CompanyDocument, EmployeeCounts, EorCompany, VoidedSignature } from '@/lib/eor/companies';
import type { PortalUser } from '@/lib/eor/portal-auth';
import type { OutboxEntry } from '@/lib/notify/outbox';
import type { AgreementDocument } from '@/lib/eor/agreement';
import {
  COMPANY_STATUS_LABELS,
  DOCUMENT_KINDS,
  MAX_DOCUMENT_BYTES,
  entityTypeLabel,
  formatUsd,
  isCompanyEditable,
  signatureBlockers,
  usStateName,
  validateCompanyInvite,
  type Errors,
} from '@/lib/eor/onboarding';
import { AgreementView } from '@/components/eor/AgreementView';
import { CompanyForm, companyFormInitial, type CompanyFormValues } from '@/components/eor/CompanyForm';
import { Badge, Notice, STATUS_TONE, Tabs, UploadButton, buttonClass, inputClass, primaryButtonClass, useQueryState } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { AddEmployees } from './AddEmployees';
import { ClientInvoices } from './ClientInvoices';
import { ClientOutstanding } from './ClientOutstanding';
import type { OutstandingList } from '@/lib/eor/outstanding';
import type { OwnershipDeclaration } from '@/lib/eor/ownership-store';
import { EmployeesTable } from './EmployeesTable';

type Detail = {
  company: EorCompany;
  counts: EmployeeCounts;
  documents: CompanyDocument[];
  contacts: PortalUser[];
  voided: VoidedSignature[];
  messages: OutboxEntry[];
  readyToSign: boolean;
  outstanding: OutstandingList;
  ownership: OwnershipDeclaration | null;
  master: { draft: AgreementDocument; text: string };
  emailConfigured: boolean;
  viewer: { email: string | null; bootstrap: boolean; role: string };
};

const stamp = (value: string | null) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
/** The two declarations, worded as what the customer told the person entering them. The signatory repeats both by signing (clauses 3 and 7). */
const STAFF_CONFIRMATIONS = {
  legend: 'The customer has confirmed to you',
  sanctions: 'The company, and anyone who owns or controls it, is not subject to US, UN, EU, UK or Indian sanctions.',
  noContracting:
    'Employees hired through Ensaar will not negotiate or sign contracts in the company\'s name. (If one will, for example in a sales role, stop and agree it with them first: it affects their tax position in India.)',
};

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className="text-sm text-ink-primary">{value || '—'}</dd>
    </div>
  );
}

export function ClientDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tabState, setTab] = useQueryState({ tab: 'employees' });
  const [reloadKey, setReloadKey] = useState(0);
  const [panel, setPanel] = useState<'changes' | 'edit' | 'contact' | 'details' | null>(null);
  // The signatory's sign-in link from the last "Send for signature", to pass on directly if wanted.
  const [signLink, setSignLink] = useState<{ link: string; email: string; emailed: boolean; copied: boolean } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/basecamp/clients/${id}`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setError(json.error || 'Unable to load.');
    setDetail(json);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Stable, because the invoices tab reloads whenever this changes.
  const onInvoiceMessage = useCallback((kind: 'ok' | 'error', text: string) => {
    setError(kind === 'error' ? text : null);
    setOk(kind === 'ok' ? text : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  async function act(payload: Record<string, unknown>, label: string, success?: string): Promise<Record<string, unknown> | null> {
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(`/api/basecamp/clients/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        // A needed document is still to come: staff may countersign anyway, on the record.
        if (json.missing && payload.action === 'approve' && !payload.confirmMissing) {
          if (window.confirm(`${json.error}\n\nCountersign now? This is recorded in the audit log.`)) {
            setBusy(null);
            return act({ ...payload, confirmMissing: true }, label, success);
          }
        }
        throw new Error(json.error || 'Unable to do that.');
      }
      if (success) setOk(success);
      await load();
      return json;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to do that.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Assisted onboarding: staff enter the details and upload the documents a customer sent them.
  async function saveDetails(form: CompanyFormValues): Promise<Errors | null> {
    setError(null);
    setOk(null);
    const response = await fetch(`/api/basecamp/clients/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'save_details', details: form }) }).catch(() => null);
    const json = (await response?.json().catch(() => ({}))) ?? {};
    if (!response?.ok) {
      if (json.errors) return json.errors as Errors;
      setError(json.error || 'Unable to save.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    }
    setPanel(null);
    setOk('Company details saved for the customer. Nobody has been emailed: send the agreement for signature when the documents are in.');
    await load();
    return null;
  }

  async function documentRequest(label: string, success: string, url: string, init: RequestInit) {
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(url, init);
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Unable to do that.');
      setOk(success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to do that.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(null);
    }
  }

  function uploadDocument(kind: string, file: File) {
    if (file.size > MAX_DOCUMENT_BYTES) return setError(`${file.name} is larger than 10 MB.`);
    const body = new FormData();
    body.set('kind', kind);
    body.set('file', file);
    void documentRequest(`upload:${kind}`, `${file.name} uploaded for the customer. Review it like any other document.`, `/api/basecamp/clients/${id}/documents`, { method: 'POST', body });
  }

  function removeDocument(file: CompanyDocument) {
    if (!window.confirm(`Remove ${file.filename}? This cannot be undone.`)) return;
    void documentRequest(`delete:${file.id}`, `${file.filename} removed.`, `/api/basecamp/clients/${id}/documents/${file.id}`, { method: 'DELETE' });
  }

  async function sendForSignature(to: string, again: boolean) {
    const question = again
      ? `Email ${to} a new link to the agreement? The earlier link keeps working until it expires.`
      : `Email ${to} a link to review and sign the agreement?`;
    if (!window.confirm(question)) return;
    setSignLink(null);
    const json = await act({ action: 'send_for_signature' }, 'send');
    if (json) setSignLink({ link: String(json.link), email: String(json.email), emailed: Boolean(json.emailConfigured), copied: false });
  }

  if (!detail) return error ? <Notice kind="error">{error}</Notice> : <p className="text-sm text-ink-secondary">Loading…</p>;

  const { company, counts, documents } = detail;
  const name = company.company?.legalName ?? company.companyName;
  const named = !detail.viewer.bootstrap;
  const open = !['active', 'cancelled'].includes(company.status);
  const docsToReview = documents.filter((d) => d.reviewStatus === 'pending').length;
  const tab = tabState.tab;
  // Until the agreement is signed, staff can enter details and documents for the customer.
  const editable = isCompanyEditable(company.status);
  const blockers = signatureBlockers(company.company);
  const signatory = company.company ? `${company.company.signatoryName} (${company.company.signatoryEmail})` : null;
  const canSend = editable && blockers.length === 0 && signatory !== null;
  // When the agreement last went to the signatory, from the email log (newest first).
  const lastSent = detail.messages.find((m) => m.kind === 'portal.sign_request');
  const sendHint = !canSend || company.status === 'changes_requested'
    ? null
    : lastSent
      ? `Agreement sent to ${company.company?.signatoryName} on ${stamp(lastSent.createdAt)}${lastSent.status === 'sent' ? '' : ` (email ${lastSent.status})`}. Waiting for them to sign.`
      : detail.readyToSign
        ? `The details are in. Send the agreement to ${company.company?.signatoryName} to sign.`
        : 'The details are in. Signing opens once the legal sign-off is recorded (see Clients).';

  // The single most useful next step for this client, shown in the header.
  const next =
    company.status === 'signed'
      ? 'Review the documents, then countersign the agreement.'
      : sendHint
        ? sendHint
        : company.status === 'invited'
          ? 'Waiting for the customer to add company details. If they have no time, enter them yourself under Company.'
          : company.status === 'onboarding'
            ? `Still needed before anyone can sign: ${blockers.join(', ')}. The customer can add them, or you can for them.`
            : company.status === 'changes_requested'
              ? 'Waiting for the customer to make the requested changes.'
            : counts.toCountersign
              ? `${counts.toCountersign} schedule${counts.toCountersign === 1 ? '' : 's'} signed by the customer to countersign.`
              : counts.draft
                ? `${counts.draft} draft${counts.draft === 1 ? '' : 's'} not yet sent to the customer.`
                : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/basecamp/clients" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary print:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All clients
        </Link>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink-primary">{name}</h1>
              <Badge tone={STATUS_TONE[company.status]}>{COMPANY_STATUS_LABELS[company.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              {counts.active} active · {counts.onboarding} onboarding · {counts.awaitingSignature} awaiting signature · {counts.toCountersign} to countersign
            </p>
            {next && <p className="mt-2 text-sm font-medium text-ink-primary">Next: {next}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {company.status === 'signed' && (
              <button
                type="button"
                disabled={busy !== null || !named}
                onClick={() => window.confirm(`Countersign the agreement with ${name} for Ensaar?`) && void act({ action: 'approve' }, 'approve', 'Agreement countersigned. The client is active.')}
                className={cn(primaryButtonClass, 'bg-emerald-600')}
              >
                {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />} Countersign agreement
              </button>
            )}
            {canSend && signatory && (
              <button type="button" disabled={busy !== null || !named || !detail.readyToSign} onClick={() => void sendForSignature(signatory, Boolean(lastSent))} className={lastSent ? buttonClass : primaryButtonClass}>
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} {lastSent ? 'Resend for signature' : 'Send for signature'}
              </button>
            )}
            {open && (
              <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'changes' ? null : 'changes')} className={buttonClass}>
                <MessageSquareWarning className="h-4 w-4" aria-hidden /> Request changes
              </button>
            )}
            {company.status !== 'cancelled' && (
              <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'edit' ? null : 'edit')} className={buttonClass}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit client
              </button>
            )}
            {company.status !== 'cancelled' && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => window.confirm(`Cancel ${name}? Their portal access ends. Only possible when nobody is employed.`) && void act({ action: 'cancel' }, 'cancel', 'Client cancelled.')}
                className={cn(buttonClass, 'text-red-700')}
              >
                <XCircle className="h-4 w-4" aria-hidden /> Cancel client
              </button>
            )}
          </div>
        </div>
      </div>

      {!named && <Notice kind="warn">You are using the shared login. Entering details or documents for a customer, reviewing, requesting changes and countersigning need your own account.</Notice>}
      {signLink && (
        <Notice kind="ok" onClose={() => setSignLink(null)}>
          {signLink.emailed ? `Sent to ${signLink.email}.` : `Email is off, so nothing was sent to ${signLink.email}.`} They review what is entered, then sign as themselves.{' '}
          <button
            type="button"
            className="underline"
            onClick={async () => {
              await navigator.clipboard.writeText(signLink.link).catch(() => undefined);
              setSignLink({ ...signLink, copied: true });
            }}
          >
            {signLink.copied ? 'Link copied' : 'Copy their sign-in link'}
          </button>{' '}
          to pass it on yourself. It works once, for {signLink.email} only.
        </Notice>
      )}
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      {ok && <Notice kind="ok" onClose={() => setOk(null)}>{ok}</Notice>}
      {company.status === 'changes_requested' && company.changesNote && <Notice kind="warn">Waiting on the customer: {company.changesNote}</Notice>}

      {panel === 'changes' && (
        <TextPanel
          label="What should the customer change?"
          hint={`Rejected documents are listed in the email automatically.${company.status === 'signed' ? ' Their signature on the agreement will be voided (kept in history).' : ''}`}
          placeholder="For example: the EIN letter is for a different company."
          submit="Send to customer"
          busy={busy === 'changes'}
          onSubmit={async (note) => (await act({ action: 'request_changes', note }, 'changes', 'Sent to the customer.')) && setPanel(null)}
        />
      )}
      {panel === 'edit' && <EditClient company={company} busy={busy === 'edit'} onSubmit={async (invite) => (await act({ action: 'update_invite', invite }, 'edit', 'Client updated.')) && setPanel(null)} />}

      <Tabs
        value={tab}
        onChange={(t) => setTab({ tab: t })}
        tabs={[
          { key: 'employees', label: 'Employees', count: counts.total },
          { key: 'company', label: 'Company' },
          { key: 'documents', label: 'Documents', count: docsToReview },
          { key: 'agreement', label: 'Agreement' },
          { key: 'invoices', label: 'Invoices' },
          { key: 'emails', label: 'Emails' },
        ]}
      />

      {tab === 'employees' && (
        <div className="space-y-4">
          {company.status !== 'cancelled' && (
            <AddEmployees
              companyId={id}
              onAdded={(message) => {
                setOk(message);
                setReloadKey((k) => k + 1);
                void load();
              }}
            />
          )}
          {company.status !== 'active' && company.status !== 'cancelled' && (
            <p className="text-xs text-ink-secondary">
              You can add and send employees now. The customer signs their schedules after signing the agreement, and you
              countersign schedules after countersigning the agreement.
            </p>
          )}
          <EmployeesTable companyId={id} reloadKey={reloadKey} onChanged={() => void load()} />
        </div>
      )}

      {tab === 'company' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {company.company && <ClientOutstanding outstanding={detail.outstanding} ownership={detail.ownership} named={named} act={act} />}
          <section className={cn('rounded-xl border border-line-subtle bg-bg-primary p-5', panel === 'details' && 'lg:col-span-2')}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-primary">
                Company details{' '}
                <span className="font-normal text-ink-secondary">
                  {!company.company ? '' : company.detailsEnteredBy ? `(entered for the customer by ${company.detailsEnteredBy})` : '(from the customer)'}
                </span>
              </h2>
              {editable && named && panel !== 'details' && (
                <button type="button" className={cn(buttonClass, 'shrink-0 px-2.5 py-1 text-xs')} onClick={() => setPanel('details')}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> {company.company ? 'Edit for the customer' : 'Enter for the customer'}
                </button>
              )}
            </div>
            {panel === 'details' && editable ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-ink-secondary">
                  Enter what the customer gave you, exactly as it appears on their documents. The agreement is built from these details, and
                  their signatory checks them and signs as themselves: you cannot sign for a customer.
                </p>
                <CompanyForm
                  initial={companyFormInitial(company.company, { companyName: company.companyName, personName: company.contactName, email: company.contactEmail })}
                  onSubmit={saveDetails}
                  onCancel={() => setPanel(null)}
                  confirmations={STAFF_CONFIRMATIONS}
                  submitLabel="Save for the customer"
                />
              </div>
            ) : company.company ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Row label="Legal name" value={company.company.legalName} />
                <Row label="Entity" value={`${entityTypeLabel(company.company.entityType)}, ${company.company.incorporationState ? usStateName(company.company.incorporationState) : 'state of formation not given yet'}`} />
                <Row label="EIN" value={company.company.ein} />
                <Row label="Website" value={company.company.website} />
                <Row label="Registered address" value={[company.company.addressLine1, company.company.addressLine2, company.company.city, `${company.company.state} ${company.company.zip}`].filter(Boolean).join(', ')} />
                <Row label="Billing email" value={company.company.billingEmail ?? 'Not given yet (invoices go to the portal users)'} />
                <Row label="Signatory" value={`${company.company.signatoryName}${company.company.signatoryTitle ? `, ${company.company.signatoryTitle}` : ''} (${company.company.signatoryEmail})`} />
                <Row label="Declarations" value="Not sanctioned · employees will not conclude contracts" />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-ink-secondary">Not completed yet.</p>
            )}
            {company.notes && <p className="mt-4 rounded-lg bg-bg-secondary p-3 text-sm text-ink-secondary">{company.notes}</p>}
          </section>
          <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-primary">Portal access</h2>
              {company.status !== 'cancelled' && (
                <button type="button" className={cn(buttonClass, 'px-2.5 py-1 text-xs')} onClick={() => setPanel(panel === 'contact' ? null : 'contact')}>
                  <UserPlus className="h-3.5 w-3.5" aria-hidden /> Add person
                </button>
              )}
            </div>
            {panel === 'contact' && <AddContact busy={busy === 'contact'} onSubmit={async (email, contactName) => (await act({ action: 'add_contact', email, name: contactName }, 'contact', `Invited ${email}.`)) && setPanel(null)} />}
            <ul className="mt-3 divide-y divide-line-subtle">
              {detail.contacts.map((u) => (
                <li key={u.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-sm">
                    <span className="block truncate text-ink-primary">
                      {u.name ?? u.email} {u.role === 'signatory' && <Badge tone="attention">Signatory</Badge>} {!u.active && <Badge tone="bad">Removed</Badge>}
                    </span>
                    <span className="block truncate text-xs text-ink-secondary">
                      {u.email} · last signed in {u.lastLoginAt ? stamp(u.lastLoginAt) : 'never'}
                    </span>
                  </span>
                  {u.active && company.status !== 'cancelled' && (
                    <span className="flex shrink-0 gap-2">
                      <ReinviteButton companyId={id} userId={u.id} onError={setError} />
                      <button type="button" className={cn(buttonClass, 'px-2 py-1 text-xs text-red-700')} onClick={() => window.confirm(`Remove ${u.email}'s access?`) && void act({ action: 'remove_contact', userId: u.id }, 'remove', 'Access removed.')}>
                        Remove
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'documents' && (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <p className="text-xs text-ink-secondary">
            Open each file and check it is the right company and the right document. Countersigning needs every required document accepted.
            {editable && named && ' If the customer sent you a document instead of using the portal, upload it here for them.'}
          </p>
          <ul className="mt-3 space-y-4">
            {DOCUMENT_KINDS.map((kind) => {
              const files = documents.filter((d) => d.kind === kind.kind);
              return (
                <li key={kind.kind} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-ink-secondary">
                      {kind.label}
                      {kind.required && !files.some((f) => f.reviewStatus !== 'rejected') && <span className="ml-2 text-xs text-red-600">missing</span>}
                    </p>
                    {editable && named && <UploadButton label={kind.label} busy={busy === `upload:${kind.kind}`} disabled={busy !== null} onFile={(file) => uploadDocument(kind.kind, file)} />}
                  </div>
                  {files.map((file) => (
                    <DocumentRow
                      key={file.id}
                      companyId={id}
                      file={file}
                      editable={open && named}
                      busy={busy !== null}
                      onReview={(decision, note) => act({ action: 'review_document', documentId: file.id, decision, note }, `doc:${file.id}`)}
                      onRemove={editable && named ? () => removeDocument(file) : undefined}
                    />
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === 'agreement' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-ink-secondary">
              {company.signedAt
                ? `Signed by ${company.signedName} (${company.signedTitle ? `${company.signedTitle}, ` : ''}${company.signedEmail}) on ${stamp(company.signedAt)}${company.signedIp ? ` from ${company.signedIp}` : ''}. Version ${company.agreementVersion}.${company.countersignedAt ? ` Countersigned by ${company.countersignedBy} on ${stamp(company.countersignedAt)}.` : ''}`
                : lastSent
                  ? `Sent to ${company.company?.signatoryName} on ${stamp(lastSent.createdAt)}. Not signed yet.`
                  : detail.readyToSign
                  ? 'Draft. The customer has not signed yet.'
                  : 'Draft. Signing is closed until the legal sign-off for this version is recorded (see Clients).'}
            </p>
            <button type="button" className={buttonClass} onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden /> Print
            </button>
          </div>
          <AgreementView
            agreement={detail.master.draft}
            signedText={company.signedAt ? detail.master.text : null}
            signature={company.signedAt ? { name: company.signedName, title: company.signedTitle, at: company.signedAt, hash: company.agreementHash, countersignedBy: company.countersignedBy, countersignedAt: company.countersignedAt } : null}
            customerName={name}
          />
          {detail.voided.length > 0 && (
            <div className="print:hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Voided signatures (kept for the record)</h3>
              <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
                {detail.voided.map((v) => (
                  <li key={v.id}>
                    {v.kind === 'master' ? 'Agreement' : 'Schedule'} signed by {v.signedName} {stamp(v.signedAt)} (version {v.agreementVersion}); voided {stamp(v.voidedAt)} by {v.voidedBy}: {v.voidReason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === 'invoices' && <ClientInvoices companyId={id} active={company.status === 'active'} named={named} onMessage={onInvoiceMessage} />}

      {tab === 'emails' && <EmailLog messages={detail.messages} emailConfigured={detail.emailConfigured} onRetried={() => void load()} onError={setError} />}
    </div>
  );
}

function TextPanel({ label, hint, placeholder, submit, busy, onSubmit }: { label: string; hint: string; placeholder: string; submit: string; busy: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form className="space-y-2 rounded-xl border border-line-subtle bg-bg-primary p-4" onSubmit={(e) => { e.preventDefault(); onSubmit(text); }}>
      <label htmlFor="panel-text" className="block text-sm font-medium text-ink-primary">{label}</label>
      <textarea id="panel-text" className={cn(inputClass, 'min-h-24')} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <p className="text-xs text-ink-secondary">{hint}</p>
      <button type="submit" disabled={busy || text.trim().length < 5} className={buttonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {submit}
      </button>
    </form>
  );
}

function EditClient({ company, busy, onSubmit }: { company: EorCompany; busy: boolean; onSubmit: (invite: Record<string, string>) => void }) {
  const [form, setForm] = useState({ companyName: company.companyName, contactName: company.contactName, contactEmail: company.contactEmail, notes: company.notes ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  return (
    <form
      noValidate
      className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const check = validateCompanyInvite(form);
        if (!check.ok) return setErrors(check.errors);
        onSubmit(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {([['companyName', 'Company name'], ['contactName', 'Contact name'], ['contactEmail', 'Contact email'], ['notes', 'Internal notes']] as const).map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block text-ink-secondary">{label}</span>
            <input className={inputClass} value={form[k]} aria-invalid={Boolean(errors[k])} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            {errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
          </label>
        ))}
      </div>
      <p className="text-xs text-ink-secondary">A new contact email is invited; the old contact keeps access until removed. What the client pays is set on each employee.</p>
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
      </button>
    </form>
  );
}

function AddContact({ busy, onSubmit }: { busy: boolean; onSubmit: (email: string, name: string) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); onSubmit(email, name); }}>
      <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
      <input className={inputClass} placeholder="email@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" required />
      <button type="submit" disabled={busy || !email} className={buttonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Invite
      </button>
    </form>
  );
}

function ReinviteButton({ companyId, userId, onError }: { companyId: string; userId: string; onError: (m: string) => void }) {
  const [state, setState] = useState<'idle' | 'busy' | { link: string; emailed: boolean }>('idle');
  const [copied, setCopied] = useState(false);
  if (typeof state === 'object') {
    return (
      <span className="flex items-center gap-1 text-xs">
        {state.emailed ? 'Sent.' : 'Email off:'}
        <button type="button" className={cn(buttonClass, 'px-2 py-1 text-xs')} onClick={async () => { await navigator.clipboard.writeText(state.link).catch(() => undefined); setCopied(true); }}>
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={state === 'busy'}
      className={cn(buttonClass, 'px-2 py-1 text-xs')}
      onClick={async () => {
        setState('busy');
        const response = await fetch(`/api/basecamp/clients/${companyId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reinvite_contact', userId }) });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          onError(json.error || 'Unable to resend.');
          return setState('idle');
        }
        setState({ link: json.link, emailed: Boolean(json.emailConfigured) });
      }}
    >
      Resend invite
    </button>
  );
}

function DocumentRow({ companyId, file, editable, busy, onReview, onRemove }: { companyId: string; file: CompanyDocument; editable: boolean; busy: boolean; onReview: (decision: string, note?: string) => Promise<unknown>; onRemove?: () => void }) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-line-subtle p-2 sm:flex-row sm:items-center sm:justify-between">
      <a href={`/api/basecamp/clients/${companyId}/documents/${file.id}`} className="inline-flex min-w-0 items-center gap-2 text-ink-primary hover:underline">
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{file.filename}</span>
        <span className="shrink-0 text-xs text-ink-secondary">({size(file.sizeBytes)})</span>
        {file.uploadedBy && <span className="hidden shrink-0 truncate text-xs text-ink-secondary md:inline">· uploaded by {file.uploadedBy}</span>}
      </a>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={file.reviewStatus === 'accepted' ? 'good' : file.reviewStatus === 'rejected' ? 'bad' : 'neutral'}>
          {file.reviewStatus === 'pending' ? 'Not reviewed' : file.reviewStatus === 'accepted' ? 'Accepted' : `Rejected: ${file.reviewNote}`}
        </Badge>
        {editable && file.reviewStatus !== 'accepted' && (
          <button type="button" disabled={busy} onClick={() => void onReview('accepted')} className={cn(buttonClass, 'px-2 py-1 text-xs')}>
            <Check className="h-3 w-3" aria-hidden /> Accept
          </button>
        )}
        {editable && file.reviewStatus !== 'rejected' && (
          <button type="button" disabled={busy} onClick={() => setRejecting('')} className={cn(buttonClass, 'px-2 py-1 text-xs text-red-700')}>
            <X className="h-3 w-3" aria-hidden /> Reject
          </button>
        )}
        {onRemove && (
          <button type="button" disabled={busy} aria-label={`Remove ${file.filename}`} onClick={onRemove} className={cn(buttonClass, 'px-2 py-1 text-xs text-ink-secondary')}>
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
      {rejecting !== null && (
        <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={async (e) => { e.preventDefault(); if (await onReview('rejected', rejecting)) setRejecting(null); }}>
          <input autoFocus aria-label="Reason the customer will see" className={inputClass} placeholder="Reason the customer will see" value={rejecting} onChange={(e) => setRejecting(e.target.value)} />
          <button type="submit" disabled={rejecting.trim().length < 3 || busy} className={cn(buttonClass, 'text-red-700')}>
            Reject
          </button>
        </form>
      )}
    </div>
  );
}

export function EmailLog({ messages, emailConfigured, onRetried, onError }: { messages: OutboxEntry[]; emailConfigured: boolean; onRetried: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (messages.length === 0) return <p className="text-sm text-ink-secondary">No emails yet.</p>;
  return (
    <ul className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-bg-primary">
      {messages.map((m) => (
        <li key={m.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0">
            <span className="block truncate text-ink-primary">{m.subject}</span>
            <span className="block truncate text-xs text-ink-secondary">
              to {m.to.join(', ')} · {stamp(m.createdAt)} ·{' '}
              <span className={m.status === 'sent' ? 'text-emerald-700' : m.status === 'pending' ? '' : 'text-red-700'}>{m.status === 'skipped' ? 'not sent (email off)' : m.status}</span>
              {m.lastError && m.status !== 'sent' ? ` · ${m.lastError}` : ''}
            </span>
          </span>
          {(m.status === 'failed' || m.status === 'skipped') && emailConfigured && (
            <button
              type="button"
              disabled={busy !== null}
              className={cn(buttonClass, 'w-fit px-2 py-1 text-xs')}
              onClick={async () => {
                setBusy(m.id);
                const response = await fetch(`/api/basecamp/outbox/${m.id}`, { method: 'POST' });
                if (!response.ok) onError((await response.json().catch(() => ({}))).error || 'Unable to retry.');
                setBusy(null);
                onRetried();
              }}
            >
              {busy === m.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <RotateCw className="h-3 w-3" aria-hidden />} Retry
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

