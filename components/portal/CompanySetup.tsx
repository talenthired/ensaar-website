'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Printer, Trash2 } from 'lucide-react';
import type { CompanyView } from '@/lib/eor/views';
import { DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, signatureMatches, type Errors } from '@/lib/eor/onboarding';
import { AgreementView } from '@/components/eor/AgreementView';
import { CompanyForm, companyFormInitial, type CompanyFormValues } from '@/components/eor/CompanyForm';
import { Badge, UploadButton, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type Say = (kind: 'error' | 'ok', text: string) => void;

export async function apiError(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) return 'Your session ended. Reload the page to sign in again.';
  if (response.status === 429) return 'Too many attempts. Wait a minute and try again.';
  return ((await response.json().catch(() => ({}))) as { error?: string }).error || fallback;
}

/** Company details: a summary once saved, the shared form while editing. */
export function CompanyDetailsForm({ view, editable, onSaved, say, onEditing }: { view: CompanyView; editable: boolean; onSaved: (v: CompanyView) => void; say: Say; onEditing?: (editing: boolean) => void }) {
  const [editing, setEditing] = useState(!view.details && editable);

  // Signing waits while details are being edited: the agreement must reflect what is saved.
  useEffect(() => onEditing?.(editing), [editing, onEditing]);

  async function save(form: CompanyFormValues): Promise<Errors | null> {
    try {
      const response = await fetch('/api/portal/company', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) {
        const json = await response.clone().json().catch(() => ({}));
        if (json.errors) return json.errors as Errors;
        throw new Error(await apiError(response, 'Unable to save.'));
      }
      const next = (await response.json()) as CompanyView;
      setEditing(false);
      onSaved(next);
      say('ok', next.me.isSignatory ? 'Company details saved.' : `Company details saved. We invited ${next.signatory?.name} to sign.`);
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    }
    return null;
  }

  if (!editing && view.details) {
    const c = view.details;
    return (
      <div className="text-sm text-ink-primary">
        <p className="font-medium">{c.legalName}</p>
        <p className="text-ink-secondary">
          EIN {c.ein} · {[c.addressLine1, c.addressLine2, c.city, `${c.state} ${c.zip}`].filter(Boolean).join(', ')}
        </p>
        <p className="text-ink-secondary">
          Signatory: {c.signatoryName}, {c.signatoryTitle} ({c.signatoryEmail}) · Invoices to {c.billingEmail}
        </p>
        {editable && (
          <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm font-medium underline">
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <CompanyForm
      initial={companyFormInitial(view.details, { companyName: view.name, personName: view.me.name, email: view.me.email })}
      onSubmit={save}
      onCancel={view.details ? () => setEditing(false) : undefined}
    />
  );
}

/** Company documents: upload, download, replace a rejected one. */
export function CompanyDocuments({ view, editable, onChanged, say }: { view: CompanyView; editable: boolean; onChanged: () => Promise<void>; say: Say }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(kind: string, file: File) {
    if (file.size > MAX_DOCUMENT_BYTES) return say('error', `${file.name} is larger than 10 MB.`);
    setBusy(`upload:${kind}`);
    try {
      const body = new FormData();
      body.set('kind', kind);
      body.set('file', file);
      const response = await fetch('/api/portal/documents', { method: 'POST', body });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to upload.'));
      await onChanged();
      say('ok', `${file.name} uploaded.`);
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to upload.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, filename: string) {
    setBusy(`delete:${id}`);
    try {
      const response = await fetch(`/api/portal/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
      // The file stays listed until the server confirms it is gone.
      if (!response.ok) throw new Error(await apiError(response, `Could not remove ${filename}. Try again.`));
      await onChanged();
      say('ok', `${filename} removed.`);
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : `Could not remove ${filename}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-3">
      {DOCUMENT_KINDS.map((kind) => {
        const files = view.documents.filter((d) => d.kind === kind.kind);
        return (
          <li key={kind.kind} className="rounded-lg border border-line-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink-primary">
                  {kind.label} {kind.required && <span className="ml-1 text-xs font-normal text-ink-secondary">Required</span>}
                </p>
                <p className="text-xs text-ink-secondary">{kind.hint}</p>
              </div>
              {editable && <UploadButton label={kind.label} busy={busy === `upload:${kind.kind}`} disabled={busy !== null} onFile={(file) => void upload(kind.kind, file)} />}
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((file) => (
                  <li key={file.id} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className={cn('h-4 w-4 shrink-0', file.reviewStatus === 'rejected' ? 'text-red-600' : 'text-emerald-600')} aria-hidden />
                        <span className="truncate">{file.filename}</span>
                        {file.reviewStatus === 'accepted' && <Badge tone="good">Accepted</Badge>}
                        {file.reviewStatus === 'rejected' && <Badge tone="bad">Needs replacing</Badge>}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <a href={`/api/portal/documents/${file.id}`} aria-label={`Download ${file.filename}`} className="text-ink-secondary hover:text-ink-primary">
                          <Download className="h-4 w-4" aria-hidden />
                        </a>
                        {editable && (
                          <button type="button" aria-label={`Remove ${file.filename}`} disabled={busy !== null} onClick={() => void remove(file.id, file.filename)} className="text-ink-secondary hover:text-red-600">
                            {busy === `delete:${file.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                          </button>
                        )}
                      </span>
                    </div>
                    {file.reviewStatus === 'rejected' && file.reviewNote && <p className="ml-6 mt-1 text-xs text-red-700">Ensaar: {file.reviewNote}. Upload a replacement, then remove this one.</p>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The master agreement: read it, and (for the signatory) sign it. */
export function MasterAgreement({ view, blocked, onSigned, say }: { view: CompanyView; blocked: string | null; onSigned: (v: CompanyView) => void; say: Say }) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const signed = Boolean(view.master.signature);
  const signatory = view.signatory?.name ?? '';

  async function sign(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/portal/agreement', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, consent, agreementHash: view.master.draftHash }),
      });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to sign.'));
      onSigned(await response.json());
      say('ok', 'Signed. Ensaar will review your documents and countersign, usually within one working day.');
    } catch (cause) {
      setConsent(false);
      say('error', cause instanceof Error ? cause.message : 'Unable to sign.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[32rem] overflow-y-auto rounded-xl print:max-h-none print:overflow-visible">
        <AgreementView agreement={view.master.draft} signedText={signed ? view.master.text : null} signature={view.master.signature} customerName={view.name} />
      </div>
      <button type="button" onClick={() => window.print()} className={cn(buttonClass, 'print:hidden')}>
        <Printer className="h-4 w-4" aria-hidden /> Print or save as PDF
      </button>
      {!signed && (
        <form onSubmit={sign} className="space-y-4 border-t border-line-subtle pt-5 print:hidden">
          {blocked ? (
            <p className="text-sm text-ink-secondary" role="status">{blocked}</p>
          ) : !view.me.isSignatory ? (
            <p className="text-sm text-ink-secondary" role="status">
              {signatory} ({view.signatory?.email}) signs for {view.name}. We have invited them to the portal.
            </p>
          ) : (
            <>
              <div className="text-sm">
                <label htmlFor="sign-name" className="mb-1 block font-medium text-ink-primary">Type {signatory} to sign</label>
                <input id="sign-name" className={cn(inputClass, 'font-serif text-lg italic')} value={name} onChange={(e) => setName(e.target.value)} placeholder={signatory} autoComplete="off" />
              </div>
              <label className="flex items-start gap-3 text-sm text-ink-primary">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I have read the agreement above, I am authorised to sign it for {view.name}, and I agree to sign electronically.</span>
              </label>
              <button type="submit" disabled={busy || !consent || !signatureMatches(name, signatory)} className={primaryButtonClass}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign agreement
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
