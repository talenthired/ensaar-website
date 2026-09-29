'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, Printer, Trash2, Upload } from 'lucide-react';
import type { CompanyView } from '@/lib/eor/views';
import { DOCUMENT_KINDS, ENTITY_TYPES, MAX_DOCUMENT_BYTES, US_STATES, signatureMatches, validateCompany, type Errors } from '@/lib/eor/onboarding';
import { AgreementView } from '@/components/eor/AgreementView';
import { Badge, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Form = Record<string, string | boolean>;
export type Say = (kind: 'error' | 'ok', text: string) => void;

const LABELS: Record<string, string> = {
  legalName: 'Legal company name', entityType: 'Entity type', incorporationState: 'State of incorporation', ein: 'EIN',
  website: 'Website', addressLine1: 'Street address', city: 'City', state: 'State', zip: 'ZIP', signatoryName: 'Signatory full name',
  signatoryTitle: 'Signatory title', signatoryEmail: 'Signatory email', billingEmail: 'Billing email',
  confirmsSanctions: 'Sanctions confirmation', confirmsNoContracting: 'Contracting confirmation',
};

export async function apiError(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) return 'Your session ended. Reload the page to sign in again.';
  if (response.status === 429) return 'Too many attempts. Wait a minute and try again.';
  return ((await response.json().catch(() => ({}))) as { error?: string }).error || fallback;
}

function initial(view: CompanyView): Form {
  const c = view.details;
  return {
    legalName: c?.legalName ?? view.name,
    entityType: c?.entityType ?? '',
    incorporationState: c?.incorporationState ?? '',
    ein: c?.ein ?? '',
    addressLine1: c?.addressLine1 ?? '',
    addressLine2: c?.addressLine2 ?? '',
    city: c?.city ?? '',
    state: c?.state ?? '',
    zip: c?.zip ?? '',
    website: c?.website ?? '',
    signatoryName: c?.signatoryName ?? view.me.name ?? '',
    signatoryTitle: c?.signatoryTitle ?? '',
    signatoryEmail: c?.signatoryEmail ?? view.me.email,
    billingEmail: c?.billingEmail ?? view.me.email,
    confirmsSanctions: Boolean(c),
    confirmsNoContracting: Boolean(c),
  };
}

/** Company details, with a linked, focused error summary and a warning before leaving unsaved edits. */
export function CompanyDetailsForm({ view, editable, onSaved, say, onEditing }: { view: CompanyView; editable: boolean; onSaved: (v: CompanyView) => void; say: Say; onEditing?: (editing: boolean) => void }) {
  const [editing, setEditing] = useState(!view.details && editable);
  const [form, setForm] = useState<Form>(() => initial(view));
  const [saved, setSaved] = useState<Form>(() => initial(view));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const dirty = editing && JSON.stringify(form) !== JSON.stringify(saved);

  // Signing waits while details are being edited: the agreement must reflect what is saved.
  useEffect(() => onEditing?.(editing), [editing, onEditing]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const showErrors = (e: Errors) => {
    setErrors(e);
    window.requestAnimationFrame(() => {
      summary.current?.focus();
      summary.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const check = validateCompany(form);
    if (!check.ok) return showErrors(check.errors);
    setBusy(true);
    try {
      const response = await fetch('/api/portal/company', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) {
        const json = await response.clone().json().catch(() => ({}));
        if (json.errors) return showErrors(json.errors);
        throw new Error(await apiError(response, 'Unable to save.'));
      }
      const next = (await response.json()) as CompanyView;
      const fresh = initial(next);
      setForm(fresh);
      setSaved(fresh);
      setErrors({});
      setEditing(false);
      onSaved(next);
      say('ok', next.me.isSignatory ? 'Company details saved.' : `Company details saved. We invited ${next.signatory?.name} to sign.`);
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
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

  const keys = Object.keys(errors);
  const f = (key: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> & { hint?: string } = {}, className = '') => {
    const { hint, ...rest } = props;
    const described = errors[key] ? `f-${key}-error` : hint ? `f-${key}-hint` : undefined;
    return (
      <div className={cn('scroll-mt-28 text-sm', className)}>
        <label htmlFor={`f-${key}`} className="mb-1 block font-medium text-ink-primary">{label}</label>
        <input id={`f-${key}`} className={inputClass} aria-invalid={Boolean(errors[key])} aria-describedby={described} value={String(form[key] ?? '')} onChange={(e) => set(key, e.target.value)} {...rest} />
        {errors[key] ? <span id={`f-${key}-error`} className="mt-1 block text-xs text-red-600">{errors[key]}</span> : hint ? <span id={`f-${key}-hint`} className="mt-1 block text-xs text-ink-secondary">{hint}</span> : null}
      </div>
    );
  };
  const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, className = '') => (
    <div className={cn('scroll-mt-28 text-sm', className)}>
      <label htmlFor={`f-${key}`} className="mb-1 block font-medium text-ink-primary">{label}</label>
      <select id={`f-${key}`} className={inputClass} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `f-${key}-error` : undefined} value={String(form[key] ?? '')} onChange={(e) => set(key, e.target.value)}>
        <option value="">Choose…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {errors[key] && <span id={`f-${key}-error`} className="mt-1 block text-xs text-red-600">{errors[key]}</span>}
    </div>
  );

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      {keys.length > 0 && (
        <div ref={summary} tabIndex={-1} role="alert" className="scroll-mt-28 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400">
          <p className="font-semibold">{keys.length === 1 ? 'One thing needs fixing' : `${keys.length} things need fixing`}</p>
          <ul className="mt-1 list-disc pl-5">
            {keys.map((k) => (
              <li key={k}>
                <a href={`#f-${k}`} className="underline" onClick={(e) => { e.preventDefault(); const el = document.getElementById(`f-${k}`); el?.focus(); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  {LABELS[k] ?? k}: {errors[k]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {f('legalName', 'Legal company name', { hint: 'Exactly as registered.' }, 'sm:col-span-2')}
        {select('entityType', 'Entity type', ENTITY_TYPES)}
        {select('incorporationState', 'State of incorporation', US_STATES.map(([c, n]) => [c, n] as const))}
        {f('ein', 'EIN', { inputMode: 'numeric', placeholder: '12-3456789', hint: 'Your 9-digit federal Employer Identification Number.' })}
        {f('website', 'Website', { placeholder: 'example.com', hint: 'Optional.' })}
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-2 text-sm font-semibold text-ink-primary">Registered address</legend>
        {f('addressLine1', 'Street address', { autoComplete: 'address-line1' }, 'sm:col-span-6')}
        {f('addressLine2', 'Suite, floor (optional)', { autoComplete: 'address-line2' }, 'sm:col-span-6')}
        {f('city', 'City', { autoComplete: 'address-level2' }, 'sm:col-span-3')}
        {select('state', 'State', US_STATES.map(([c]) => [c, c] as const), 'sm:col-span-2')}
        {f('zip', 'ZIP', { inputMode: 'numeric', autoComplete: 'postal-code' }, 'sm:col-span-1')}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink-primary">Who signs and who gets invoices</legend>
        {f('signatoryName', 'Signatory full name', { hint: 'Someone authorised to sign contracts for the company. Only they can sign.' })}
        {f('signatoryTitle', 'Signatory title', { placeholder: 'CEO' })}
        {f('signatoryEmail', 'Signatory email', { type: 'email', hint: 'They sign in to the portal with this address.' })}
        {f('billingEmail', 'Billing email', { type: 'email', hint: 'Where invoices go.' })}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink-primary">Please confirm</legend>
        {([
          ['confirmsSanctions', 'The company, and anyone who owns or controls it, is not subject to US, UN, EU, UK or Indian sanctions.'],
          ['confirmsNoContracting', 'Employees hired through Ensaar will not negotiate or sign contracts in the company\'s name. (If one will, for example in a sales role, tell us first: it affects your tax position in India.)'],
        ] as const).map(([k, label]) => (
          <div key={k} className="scroll-mt-28">
            <label className="flex items-start gap-3 text-sm text-ink-primary">
              <input id={`f-${k}`} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `f-${k}-error` : undefined} checked={Boolean(form[k])} onChange={(e) => set(k, e.target.checked)} />
              <span>{label}</span>
            </label>
            {errors[k] && <span id={`f-${k}-error`} className="ml-7 block text-xs text-red-600">{errors[k]}</span>}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save company details
        </button>
        {view.details && (
          <button type="button" onClick={() => { setForm(saved); setErrors({}); setEditing(false); }} className="text-sm text-ink-secondary underline">
            Discard changes
          </button>
        )}
        {dirty && <span className="text-xs text-amber-700">You have unsaved changes.</span>}
      </div>
    </form>
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

function UploadButton({ label, busy, disabled, onFile }: { label: string; busy: boolean; disabled: boolean; onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" aria-label={`Upload ${label}`} accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onFile(file); }} />
      <button type="button" disabled={disabled} onClick={() => ref.current?.click()} className={cn(buttonClass, 'shrink-0 px-3 py-1.5')}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />} Upload
      </button>
    </>
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
