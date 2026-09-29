'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FileText, Loader2, Printer, ShieldAlert, Trash2, Upload } from 'lucide-react';
import type { PortalView } from '@/lib/eor/portal';
import {
  DOCUMENT_KINDS,
  ENTITY_TYPES,
  MAX_DOCUMENT_BYTES,
  US_STATES,
  formatDay,
  formatInr,
  formatUsd,
  isEditable,
  signatureMatches,
  validateCompany,
  type Errors,
} from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';
import { AgreementView } from './AgreementView';

type View = PortalView;
type Form = Record<string, string | boolean>;

const input =
  'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20';

function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1 block font-medium text-ink-primary">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

function StepHeader({ n, title, done, subtitle }: { n: number; title: string; done: boolean; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          done ? 'bg-emerald-600 text-white' : 'bg-ink-primary text-bg-primary',
        )}
      >
        {done ? <Check className="h-4 w-4" aria-hidden /> : n}
      </span>
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
        <p className="text-sm text-ink-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

function initialForm(view: View): Form {
  const c = view.company;
  return {
    legalName: c?.legalName ?? view.hire.companyName,
    entityType: c?.entityType ?? '',
    incorporationState: c?.incorporationState ?? '',
    ein: c?.ein ?? '',
    addressLine1: c?.addressLine1 ?? '',
    addressLine2: c?.addressLine2 ?? '',
    city: c?.city ?? '',
    state: c?.state ?? '',
    zip: c?.zip ?? '',
    website: c?.website ?? '',
    signatoryName: c?.signatoryName ?? view.hire.contactName,
    signatoryTitle: c?.signatoryTitle ?? '',
    signatoryEmail: c?.signatoryEmail ?? view.hire.contactEmail,
    billingEmail: c?.billingEmail ?? view.hire.contactEmail,
    confirmsHire: Boolean(c),
    confirmsSanctions: Boolean(c),
    confirmsNoContracting: Boolean(c),
  };
}

const TOKEN_KEY = 'ensaar-onboarding-token';
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Take the token from the link's fragment, keep it for this tab only, and clear
 * it from the address bar so it is not left in history, on screen, or in a
 * screenshot. A refresh in the same tab still works from sessionStorage.
 */
function readToken(): string | null {
  const fromHash = window.location.hash.replace(/^#/, '');
  if (TOKEN_SHAPE.test(fromHash)) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, fromHash);
    } catch {
      /* private mode: the token still works for this page view */
    }
    window.history.replaceState(null, '', window.location.pathname);
    return fromHash;
  }
  try {
    const stored = window.sessionStorage.getItem(TOKEN_KEY);
    return stored && TOKEN_SHAPE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The customer's side of EOR onboarding: company details, documents, signature.
 * Three steps on one page, because a customer doing this once should see the
 * whole job at a glance rather than click through a wizard to find out its length.
 */
export function OnboardingPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({});
  const [errors, setErrors] = useState<Errors>({});
  const [editingCompany, setEditingCompany] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [signName, setSignName] = useState('');
  const [consent, setConsent] = useState(false);
  const base = '/api/onboard';
  const auth = useCallback((init: RequestInit = {}): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set('x-onboarding-token', token);
    return { ...init, headers, cache: 'no-store' };
  }, [token]);

  const apply = useCallback((next: View) => {
    setView(next);
    setForm(initialForm(next));
    setEditingCompany(!next.company);
  }, []);

  useEffect(() => {
    const found = readToken();
    if (!found) setLoadError('This onboarding link is not valid or has expired. Ask Ensaar for a new one.');
    else setToken(found);
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const response = await fetch(base, auth());
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'This link is not valid.');
        apply(data);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : 'This link is not valid.');
      }
    })();
  }, [token, auth, apply]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-line-subtle bg-bg-primary p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-ink-secondary" aria-hidden />
        <p className="mt-3 text-ink-primary">{loadError}</p>
        <p className="mt-1 text-sm text-ink-secondary">
          Write to <a className="underline" href="mailto:info@ensaar.com">info@ensaar.com</a> and we will send a fresh link.
        </p>
      </div>
    );
  }
  if (!view) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your onboarding…
      </p>
    );
  }

  const editable = isEditable(view.status);
  const companyDone = Boolean(view.company);
  const docsDone = view.missingDocuments.length === 0;
  const signed = Boolean(view.signature);
  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    const check = validateCompany(form);
    if (!check.ok) {
      setErrors(check.errors);
      setNotice({ kind: 'error', text: 'Please check the highlighted fields.' });
      return;
    }
    setBusy('company');
    try {
      const response = await fetch(
        base,
        auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }),
      );
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? {});
        throw new Error(data.error || 'Unable to save.');
      }
      setErrors({});
      apply(data);
      setNotice({ kind: 'ok', text: 'Company details saved.' });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to save.' });
    } finally {
      setBusy(null);
    }
  }

  async function reload() {
    const response = await fetch(base, auth());
    if (response.ok) {
      const data = await response.json();
      setView(data);
    }
  }

  async function upload(kind: string, file: File) {
    setNotice(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setNotice({ kind: 'error', text: `${file.name} is larger than 10 MB.` });
      return;
    }
    setBusy(`upload:${kind}`);
    try {
      const body = new FormData();
      body.set('kind', kind);
      body.set('file', file);
      const response = await fetch(`${base}/documents`, auth({ method: 'POST', body }));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to upload.');
      await reload();
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to upload.' });
    } finally {
      setBusy(null);
    }
  }

  async function removeDocument(id: string) {
    setBusy(`delete:${id}`);
    try {
      await fetch(`${base}/documents/${encodeURIComponent(id)}`, auth({ method: 'DELETE' }));
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function sign(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setBusy('sign');
    try {
      const response = await fetch(
        `${base}/sign`,
        auth({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: signName, consent, agreementHash: view?.draftHash }),
        }),
      );
      const data = await response.json();
      if (!response.ok) {
        // The text changed after it was shown: show the new version, never sign the old one.
        if (data.changed) {
          setConsent(false);
          await reload();
        }
        throw new Error(data.error || 'Unable to sign.');
      }
      apply(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to sign.' });
    } finally {
      setBusy(null);
    }
  }

  const signatory = String(form.signatoryName || view.company?.signatoryName || '');
  const canSign = editable && companyDone && docsDone && consent && signatureMatches(signName, view.company?.signatoryName ?? '');

  return (
    <div className="space-y-8">
      <header className="print:hidden">
        <span className="eyebrow">Ensaar onboarding</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink-primary">
          Welcome, {view.hire.contactName.split(' ')[0]}
        </h1>
        <p className="mt-2 text-ink-secondary">
          Ensaar will employ <strong className="text-ink-primary">{view.hire.employeeName}</strong> in India for{' '}
          {view.hire.companyName}. Three short steps, about ten minutes.
        </p>
      </header>

      {signed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 print:hidden">
          <p className="font-semibold">
            {view.status === 'approved' ? 'All done. Your agreement is countersigned.' : 'Signed. Thank you.'}
          </p>
          <p className="mt-1">
            {view.status === 'approved'
              ? `We will send ${view.hire.employeeName} their employment contract and keep you posted on their start date.`
              : 'Ensaar will review your documents and countersign, usually within one working day. Keep this link to download your copy.'}
          </p>
        </div>
      )}

      <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden">
        <h2 className="text-sm font-semibold text-ink-primary">The hire</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {[
            ['Employee', view.hire.employeeName],
            ['Job title', view.hire.jobTitle],
            ['Start date', formatDay(view.hire.startDate)],
            ['Works from', `${view.hire.workState}, India`],
            ['Annual gross salary', formatInr(view.hire.salaryInr)],
            ['Ensaar fee', `${formatUsd(view.hire.monthlyFeeUsd)} a month`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-secondary">{label}</dt>
              <dd className="font-medium text-ink-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-secondary">
          Salary and statutory employer contributions are passed through at cost. Anything wrong here? Write to
          info@ensaar.com before you sign.
        </p>
      </section>

      {notice && (
        <p
          role="status"
          className={cn(
            'rounded-lg px-4 py-3 text-sm print:hidden',
            notice.kind === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-800',
          )}
        >
          {notice.text}
        </p>
      )}

      {/* Step 1 */}
      <section className="space-y-5 rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden md:p-6">
        <StepHeader n={1} title="Your company" done={companyDone} subtitle="Who we are contracting with, and who signs." />
        {companyDone && !editingCompany && view.company ? (
          <div className="text-sm text-ink-primary">
            <p className="font-medium">{view.company.legalName}</p>
            <p className="text-ink-secondary">
              EIN {view.company.ein} · {[view.company.addressLine1, view.company.addressLine2, view.company.city, `${view.company.state} ${view.company.zip}`].filter(Boolean).join(', ')}
            </p>
            <p className="text-ink-secondary">
              Signing: {view.company.signatoryName}, {view.company.signatoryTitle} · Invoices to {view.company.billingEmail}
            </p>
            {editable && (
              <button type="button" onClick={() => setEditingCompany(true)} className="mt-3 text-sm font-medium underline">
                Edit
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={saveCompany} noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal company name" error={errors.legalName} hint="Exactly as registered." className="sm:col-span-2">
                <input className={input} value={String(form.legalName ?? '')} onChange={(e) => set('legalName', e.target.value)} />
              </Field>
              <Field label="Entity type" error={errors.entityType}>
                <select className={input} value={String(form.entityType ?? '')} onChange={(e) => set('entityType', e.target.value)}>
                  <option value="">Choose…</option>
                  {ENTITY_TYPES.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="State of incorporation" error={errors.incorporationState}>
                <select className={input} value={String(form.incorporationState ?? '')} onChange={(e) => set('incorporationState', e.target.value)}>
                  <option value="">Choose…</option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </Field>
              <Field label="EIN" error={errors.ein} hint="Your 9-digit federal Employer Identification Number.">
                <input className={input} inputMode="numeric" placeholder="12-3456789" value={String(form.ein ?? '')} onChange={(e) => set('ein', e.target.value)} />
              </Field>
              <Field label="Website" error={errors.website} hint="Optional.">
                <input className={input} placeholder="example.com" value={String(form.website ?? '')} onChange={(e) => set('website', e.target.value)} />
              </Field>
            </div>

            <fieldset className="grid gap-4 sm:grid-cols-6">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Registered address</legend>
              <Field label="Street address" error={errors.addressLine1} className="sm:col-span-6">
                <input className={input} autoComplete="address-line1" value={String(form.addressLine1 ?? '')} onChange={(e) => set('addressLine1', e.target.value)} />
              </Field>
              <Field label="Suite, floor (optional)" className="sm:col-span-6">
                <input className={input} autoComplete="address-line2" value={String(form.addressLine2 ?? '')} onChange={(e) => set('addressLine2', e.target.value)} />
              </Field>
              <Field label="City" error={errors.city} className="sm:col-span-3">
                <input className={input} autoComplete="address-level2" value={String(form.city ?? '')} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="State" error={errors.state} className="sm:col-span-2">
                <select className={input} value={String(form.state ?? '')} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Choose…</option>
                  {US_STATES.map(([code]) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </Field>
              <Field label="ZIP" error={errors.zip} className="sm:col-span-1">
                <input className={input} autoComplete="postal-code" inputMode="numeric" value={String(form.zip ?? '')} onChange={(e) => set('zip', e.target.value)} />
              </Field>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Who signs and who gets invoices</legend>
              <Field label="Signatory full name" error={errors.signatoryName} hint="Someone authorised to sign contracts for the company.">
                <input className={input} value={String(form.signatoryName ?? '')} onChange={(e) => set('signatoryName', e.target.value)} />
              </Field>
              <Field label="Signatory title" error={errors.signatoryTitle}>
                <input className={input} placeholder="CEO" value={String(form.signatoryTitle ?? '')} onChange={(e) => set('signatoryTitle', e.target.value)} />
              </Field>
              <Field label="Signatory email" error={errors.signatoryEmail}>
                <input type="email" className={input} value={String(form.signatoryEmail ?? '')} onChange={(e) => set('signatoryEmail', e.target.value)} />
              </Field>
              <Field label="Billing email" error={errors.billingEmail} hint="Where invoices go.">
                <input type="email" className={input} value={String(form.billingEmail ?? '')} onChange={(e) => set('billingEmail', e.target.value)} />
              </Field>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Please confirm</legend>
              {(
                [
                  ['confirmsHire', 'The hire details above are correct.'],
                  [
                    'confirmsSanctions',
                    'The company, and anyone who owns or controls it, is not subject to US, UN, EU, UK or Indian sanctions.',
                  ],
                  [
                    'confirmsNoContracting',
                    `${view.hire.employeeName} will not negotiate or sign contracts in the company's name. (If they will, for example in a sales role, email us before signing: it affects your tax position in India.)`,
                  ],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 text-sm text-ink-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    checked={Boolean(form[key])}
                    onChange={(e) => set(key, e.target.checked)}
                  />
                  <span>
                    {label}
                    {errors[key] && <span className="block text-xs text-red-600">{errors[key]}</span>}
                  </span>
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              disabled={busy === 'company'}
              className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-5 py-2.5 text-sm font-medium text-bg-primary disabled:opacity-60"
            >
              {busy === 'company' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Save and continue
            </button>
          </form>
        )}
      </section>

      {/* Step 2 */}
      <section className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden md:p-6">
        <StepHeader n={2} title="Documents" done={docsDone} subtitle="PDF, PNG or JPEG, up to 10 MB each. Two are required." />
        <ul className="space-y-3">
          {DOCUMENT_KINDS.map((kind) => {
            const files = view.documents.filter((d) => d.kind === kind.kind);
            return (
              <li key={kind.kind} className="rounded-lg border border-line-subtle p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      {kind.label}
                      {kind.required && <span className="ml-2 text-xs font-normal text-ink-secondary">Required</span>}
                    </p>
                    <p className="text-xs text-ink-secondary">{kind.hint}</p>
                  </div>
                  {editable && <UploadButton busy={busy === `upload:${kind.kind}`} onFile={(f) => void upload(kind.kind, f)} />}
                </div>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {files.map((file) => (
                      <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 text-ink-primary">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                          <span className="truncate">{file.filename}</span>
                        </span>
                        {editable && (
                          <button
                            type="button"
                            aria-label={`Remove ${file.filename}`}
                            disabled={busy === `delete:${file.id}`}
                            onClick={() => void removeDocument(file.id)}
                            className="text-ink-secondary hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Step 3 */}
      <section className="space-y-5 rounded-xl border border-line-subtle bg-bg-primary p-5 md:p-6 print:border-0 print:p-0">
        <div className="print:hidden">
          <StepHeader
            n={3}
            title={signed ? 'Your agreement' : 'Review and sign'}
            done={signed}
            subtitle={
              signed
                ? 'Your signed copy. Use Print to save it as a PDF.'
                : 'The Employer of Record services agreement, filled in from steps 1 and 2.'
            }
          />
        </div>
        <div className="max-h-[32rem] overflow-y-auto rounded-xl print:max-h-none print:overflow-visible">
          <AgreementView
            agreement={view.agreement}
            signedText={signed ? view.agreementText : null}
            signature={view.signature}
            customerName={view.company?.legalName ?? view.hire.companyName}
          />
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-line-subtle px-4 py-2 text-sm text-ink-primary print:hidden"
        >
          <Printer className="h-4 w-4" aria-hidden /> Print or save as PDF
        </button>

        {editable && (
          <form onSubmit={sign} className="space-y-4 border-t border-line-subtle pt-5 print:hidden">
            {!companyDone || !docsDone ? (
              <p className="text-sm text-ink-secondary">
                Finish {[!companyDone && 'your company details', !docsDone && 'the required documents'].filter(Boolean).join(' and ')}{' '}
                to sign.
              </p>
            ) : (
              <>
                <Field label={`Type ${signatory} to sign`} hint="Your typed name is your signature.">
                  <input
                    className={cn(input, 'font-serif text-lg italic')}
                    value={signName}
                    onChange={(e) => setSignName(e.target.value)}
                    placeholder={signatory}
                    autoComplete="off"
                  />
                </Field>
                <label className="flex items-start gap-3 text-sm text-ink-primary">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    I have read the agreement, I am authorised to sign it for {view.company?.legalName}, and I agree to
                    sign electronically.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!canSign || busy === 'sign'}
                  className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-5 py-2.5 text-sm font-medium text-bg-primary disabled:opacity-50"
                >
                  {busy === 'sign' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Sign agreement
                </button>
              </>
            )}
          </form>
        )}
      </section>
    </div>
  );
}

function UploadButton({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line-subtle px-3 py-1.5 text-sm text-ink-primary hover:bg-bg-secondary disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        Upload
      </button>
    </>
  );
}
