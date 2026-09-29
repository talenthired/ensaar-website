'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Circle,
  Download,
  FileText,
  Loader2,
  MailCheck,
  Printer,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
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
  'w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20 aria-[invalid=true]:border-red-500';

// The fixed site header covers the top of the page; errors must scroll below it.
const SCROLL_MARGIN = 'scroll-mt-28';

const FIELD_LABELS: Record<string, string> = {
  legalName: 'Legal company name',
  entityType: 'Entity type',
  incorporationState: 'State of incorporation',
  ein: 'EIN',
  website: 'Website',
  addressLine1: 'Street address',
  city: 'City',
  state: 'State',
  zip: 'ZIP',
  signatoryName: 'Signatory full name',
  signatoryTitle: 'Signatory title',
  signatoryEmail: 'Signatory email',
  billingEmail: 'Billing email',
  confirmsHire: 'Hire details confirmation',
  confirmsSanctions: 'Sanctions confirmation',
  confirmsNoContracting: 'Contracting confirmation',
};

/**
 * One labelled field. The control gets an id, aria-invalid and aria-describedby
 * pointing at its error or hint, so a screen reader announces the problem with
 * the field (EOR-11).
 */
function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('text-sm', SCROLL_MARGIN, className)}>
      <label htmlFor={id} className="mb-1 block font-medium text-ink-primary">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-ink-secondary">
          {hint}
        </span>
      ) : null}
    </div>
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

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) return 'This onboarding link is no longer valid. Request a new one below.';
  if (response.status === 429) return 'Too many attempts. Wait a minute and try again.';
  return (data as { error?: string }).error || fallback;
}

/**
 * The customer's side of EOR onboarding: company details, documents, signatory
 * verification and signature. All steps on one page, because a customer doing
 * this once should see the whole job at a glance.
 */
export function OnboardingPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({});
  const [savedForm, setSavedForm] = useState<Form>({});
  const [errors, setErrors] = useState<Errors>({});
  const [editingCompany, setEditingCompany] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [signName, setSignName] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const base = '/api/onboard';

  const auth = useCallback(
    (init: RequestInit = {}): RequestInit => {
      const headers = new Headers(init.headers);
      if (token) headers.set('x-onboarding-token', token);
      return { ...init, headers, cache: 'no-store' };
    },
    [token],
  );

  const apply = useCallback((next: View) => {
    const fresh = initialForm(next);
    setView(next);
    setForm(fresh);
    setSavedForm(fresh);
    setEditingCompany(!next.company && isEditable(next.status));
    // Whatever was signed-for before no longer matches: ask again.
    setConsent(false);
  }, []);

  useEffect(() => {
    const found = readToken();
    if (!found) setLoadError('This onboarding link is not valid or has expired.');
    else setToken(found);
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const response = await fetch(base, auth());
        if (!response.ok) throw new Error(await errorFrom(response, 'This link is not valid.'));
        apply(await response.json());
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : 'This link is not valid.');
      }
    })();
  }, [token, auth, apply]);

  // Unsaved company edits (EOR-04): warn before leaving, and block signing below.
  const dirty = editingCompany && JSON.stringify(form) !== JSON.stringify(savedForm);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) return <InvalidLink message={loadError} />;
  if (!view) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your onboarding…
      </p>
    );
  }

  const editable = isEditable(view.status);
  const companyDone = Boolean(view.company);
  const docsDone = view.missingDocuments.length === 0;
  const verified = view.signatory.verified;
  const signed = Boolean(view.signature);
  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function reload(): Promise<boolean> {
    try {
      const response = await fetch(base, auth());
      if (!response.ok) {
        setNotice({ kind: 'error', text: await errorFrom(response, 'Could not refresh the page. Reload to see the latest.') });
        return false;
      }
      const data = (await response.json()) as View;
      setView(data);
      return true;
    } catch {
      setNotice({ kind: 'error', text: 'You appear to be offline. Reload the page to see the latest.' });
      return false;
    }
  }

  function showErrors(next: Errors) {
    setErrors(next);
    setNotice(null);
    // Move focus to the summary so keyboard, screen reader and mobile users land on the problems.
    window.requestAnimationFrame(() => {
      summaryRef.current?.focus();
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    const check = validateCompany(form);
    if (!check.ok) return showErrors(check.errors);
    setBusy('company');
    try {
      const response = await fetch(
        base,
        auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }),
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.errors) return showErrors(data.errors);
        throw new Error(await errorFrom(response, 'Unable to save.'));
      }
      setErrors({});
      apply(data);
      setNotice({ kind: 'ok', text: 'Company details saved. Review the updated agreement below before signing.' });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to save.' });
    } finally {
      setBusy(null);
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
      if (!response.ok) throw new Error(await errorFrom(response, 'Unable to upload.'));
      await reload();
      setNotice({ kind: 'ok', text: `${file.name} uploaded.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Unable to upload.' });
    } finally {
      setBusy(null);
    }
  }

  async function removeDocument(id: string, filename: string) {
    setNotice(null);
    setBusy(`delete:${id}`);
    try {
      const response = await fetch(`${base}/documents/${encodeURIComponent(id)}`, auth({ method: 'DELETE' }));
      // The file stays listed until the server confirms it is gone (EOR-05).
      if (!response.ok) throw new Error(await errorFrom(response, `Could not remove ${filename}. Try again.`));
      if (await reload()) setNotice({ kind: 'ok', text: `${filename} removed.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : `Could not remove ${filename}. Try again.` });
    } finally {
      setBusy(null);
    }
  }

  async function downloadDocument(id: string, filename: string) {
    setBusy(`download:${id}`);
    try {
      const response = await fetch(`${base}/documents/${encodeURIComponent(id)}`, auth());
      if (!response.ok) throw new Error(await errorFrom(response, `Could not download ${filename}.`));
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : `Could not download ${filename}.` });
    } finally {
      setBusy(null);
    }
  }

  async function sendCode() {
    setNotice(null);
    setBusy('code-send');
    try {
      const response = await fetch(
        `${base}/verify`,
        auth({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'send' }) }),
      );
      if (!response.ok) throw new Error(await errorFrom(response, 'Could not send the code.'));
      const data = (await response.json()) as { sentTo: string };
      setCodeSentTo(data.sentTo);
      setNotice({ kind: 'ok', text: `We emailed a 6-digit code to ${data.sentTo}.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'Could not send the code.' });
    } finally {
      setBusy(null);
    }
  }

  async function checkCode(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setBusy('code-check');
    try {
      const response = await fetch(
        `${base}/verify`,
        auth({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'check', code }) }),
      );
      if (!response.ok) throw new Error(await errorFrom(response, 'That code did not work.'));
      apply(await response.json());
      setCode('');
      setNotice({ kind: 'ok', text: 'Signatory verified.' });
    } catch (cause) {
      setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'That code did not work.' });
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
      const data = await response.json().catch(() => ({}));
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

  const signatory = view.company?.signatoryName ?? '';
  const signBlocked = !view.readyToSign
    ? 'The agreement is being finalised by our legal team. We will email you as soon as it is ready to sign.'
    : dirty || editingCompany
      ? 'Save or discard your company changes first, then review the updated agreement.'
      : !companyDone || !docsDone
        ? `Finish ${[!companyDone && 'your company details', !docsDone && 'the required documents'].filter(Boolean).join(' and ')} to sign.`
        : !verified
          ? 'Verify the signatory first (step 3).'
          : null;
  const canSign = editable && !signBlocked && consent && signatureMatches(signName, signatory) && busy === null;
  const errorKeys = Object.keys(errors);

  return (
    <div className="space-y-8">
      <header className="print:hidden">
        <span className="eyebrow">Ensaar onboarding</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink-primary">Welcome, {view.hire.contactName.split(' ')[0]}</h1>
        <p className="mt-2 text-ink-secondary">
          Ensaar will employ <strong className="text-ink-primary">{view.hire.employeeName}</strong> in India for{' '}
          {view.hire.companyName}.
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          This private link works until {formatDay(view.expiresAt)}. If it expires, you can{' '}
          <Link href="/onboard/recover" className="underline">
            get a new one by email
          </Link>
          .
        </p>
      </header>

      {view.changesNote && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 print:hidden">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Ensaar asked for changes
          </p>
          <p className="mt-1 whitespace-pre-line">{view.changesNote}</p>
        </div>
      )}

      {signed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 print:hidden">
          <p className="font-semibold">
            {view.status === 'approved' ? 'All done. Your agreement is countersigned.' : 'Signed. Thank you.'}
          </p>
          <p className="mt-1">
            {view.status === 'approved'
              ? `We emailed the executed agreement. You can follow ${view.hire.employeeName}'s onboarding below.`
              : 'We emailed a copy of what you signed. Ensaar will review your documents and countersign, usually within one working day.'}
          </p>
        </div>
      )}

      {view.employee && (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden">
          <h2 className="text-sm font-semibold text-ink-primary">
            {view.hire.employeeName}&apos;s onboarding ({view.employee.steps.filter((s) => s.done).length} of {view.employee.steps.length})
          </h2>
          <p className="text-xs text-ink-secondary">Aiming for a start on {formatDay(view.employee.dueDate)}.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {view.employee.steps.map((step) => (
              <li key={step.key} className="flex items-center gap-2">
                {step.done ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 text-ink-secondary" aria-hidden />
                )}
                <span className={step.done ? 'text-ink-primary' : 'text-ink-secondary'}>
                  {step.label}
                  <span className="sr-only">{step.done ? ' (done)' : ' (to do)'}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
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
          support@ensaar.com before you sign and we will correct it.
        </p>
      </section>

      <div aria-live="polite" className="print:hidden">
        {notice && (
          <p
            className={cn(
              'rounded-lg px-4 py-3 text-sm',
              notice.kind === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-800',
            )}
          >
            {notice.text}
          </p>
        )}
      </div>

      {/* Step 1 */}
      <section className="space-y-5 rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden md:p-6">
        <StepHeader n={1} title="Your company" done={companyDone && !editingCompany} subtitle="Who we are contracting with, and who signs." />
        {companyDone && !editingCompany && view.company ? (
          <div className="text-sm text-ink-primary">
            <p className="font-medium">{view.company.legalName}</p>
            <p className="text-ink-secondary">
              EIN {view.company.ein} ·{' '}
              {[view.company.addressLine1, view.company.addressLine2, view.company.city, `${view.company.state} ${view.company.zip}`]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p className="text-ink-secondary">
              Signing: {view.company.signatoryName}, {view.company.signatoryTitle} ({view.company.signatoryEmail}) · Invoices to{' '}
              {view.company.billingEmail}
            </p>
            {editable && (
              <button type="button" onClick={() => setEditingCompany(true)} className="mt-3 text-sm font-medium underline">
                Edit
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={saveCompany} noValidate className="space-y-5">
            {errorKeys.length > 0 && (
              <div
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
                className={cn('rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400', SCROLL_MARGIN)}
              >
                <p className="font-semibold">
                  {errorKeys.length === 1 ? 'One thing needs fixing' : `${errorKeys.length} things need fixing`}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {errorKeys.map((key) => (
                    <li key={key}>
                      <a
                        href={`#f-${key}`}
                        className="underline"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(`f-${key}`);
                          el?.focus();
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        {FIELD_LABELS[key] ?? key}: {errors[key]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-legalName" label="Legal company name" error={errors.legalName} hint="Exactly as registered." className="sm:col-span-2">
                {(p) => <input {...p} className={input} value={String(form.legalName ?? '')} onChange={(e) => set('legalName', e.target.value)} />}
              </Field>
              <Field id="f-entityType" label="Entity type" error={errors.entityType}>
                {(p) => (
                  <select {...p} className={input} value={String(form.entityType ?? '')} onChange={(e) => set('entityType', e.target.value)}>
                    <option value="">Choose…</option>
                    {ENTITY_TYPES.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field id="f-incorporationState" label="State of incorporation" error={errors.incorporationState}>
                {(p) => (
                  <select {...p} className={input} value={String(form.incorporationState ?? '')} onChange={(e) => set('incorporationState', e.target.value)}>
                    <option value="">Choose…</option>
                    {US_STATES.map(([c, name]) => (
                      <option key={c} value={c}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field id="f-ein" label="EIN" error={errors.ein} hint="Your 9-digit federal Employer Identification Number.">
                {(p) => <input {...p} className={input} inputMode="numeric" placeholder="12-3456789" value={String(form.ein ?? '')} onChange={(e) => set('ein', e.target.value)} />}
              </Field>
              <Field id="f-website" label="Website" error={errors.website} hint="Optional.">
                {(p) => <input {...p} className={input} placeholder="example.com" value={String(form.website ?? '')} onChange={(e) => set('website', e.target.value)} />}
              </Field>
            </div>

            <fieldset className="grid gap-4 sm:grid-cols-6">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Registered address</legend>
              <Field id="f-addressLine1" label="Street address" error={errors.addressLine1} className="sm:col-span-6">
                {(p) => <input {...p} className={input} autoComplete="address-line1" value={String(form.addressLine1 ?? '')} onChange={(e) => set('addressLine1', e.target.value)} />}
              </Field>
              <Field id="f-addressLine2" label="Suite, floor (optional)" className="sm:col-span-6">
                {(p) => <input {...p} className={input} autoComplete="address-line2" value={String(form.addressLine2 ?? '')} onChange={(e) => set('addressLine2', e.target.value)} />}
              </Field>
              <Field id="f-city" label="City" error={errors.city} className="sm:col-span-3">
                {(p) => <input {...p} className={input} autoComplete="address-level2" value={String(form.city ?? '')} onChange={(e) => set('city', e.target.value)} />}
              </Field>
              <Field id="f-state" label="State" error={errors.state} className="sm:col-span-2">
                {(p) => (
                  <select {...p} className={input} value={String(form.state ?? '')} onChange={(e) => set('state', e.target.value)}>
                    <option value="">Choose…</option>
                    {US_STATES.map(([c]) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field id="f-zip" label="ZIP" error={errors.zip} className="sm:col-span-1">
                {(p) => <input {...p} className={input} autoComplete="postal-code" inputMode="numeric" value={String(form.zip ?? '')} onChange={(e) => set('zip', e.target.value)} />}
              </Field>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Who signs and who gets invoices</legend>
              <Field id="f-signatoryName" label="Signatory full name" error={errors.signatoryName} hint="Someone authorised to sign contracts for the company.">
                {(p) => <input {...p} className={input} value={String(form.signatoryName ?? '')} onChange={(e) => set('signatoryName', e.target.value)} />}
              </Field>
              <Field id="f-signatoryTitle" label="Signatory title" error={errors.signatoryTitle}>
                {(p) => <input {...p} className={input} placeholder="CEO" value={String(form.signatoryTitle ?? '')} onChange={(e) => set('signatoryTitle', e.target.value)} />}
              </Field>
              <Field id="f-signatoryEmail" label="Signatory email" error={errors.signatoryEmail} hint="We send a code here to confirm it is them.">
                {(p) => <input {...p} type="email" className={input} value={String(form.signatoryEmail ?? '')} onChange={(e) => set('signatoryEmail', e.target.value)} />}
              </Field>
              <Field id="f-billingEmail" label="Billing email" error={errors.billingEmail} hint="Where invoices go.">
                {(p) => <input {...p} type="email" className={input} value={String(form.billingEmail ?? '')} onChange={(e) => set('billingEmail', e.target.value)} />}
              </Field>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-ink-primary">Please confirm</legend>
              {(
                [
                  ['confirmsHire', 'The hire details above are correct.'],
                  ['confirmsSanctions', 'The company, and anyone who owns or controls it, is not subject to US, UN, EU, UK or Indian sanctions.'],
                  [
                    'confirmsNoContracting',
                    `${view.hire.employeeName} will not negotiate or sign contracts in the company's name. (If they will, for example in a sales role, email us before signing: it affects your tax position in India.)`,
                  ],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={SCROLL_MARGIN}>
                  <label className="flex items-start gap-3 text-sm text-ink-primary">
                    <input
                      id={`f-${key}`}
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? `f-${key}-error` : undefined}
                      checked={Boolean(form[key])}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                  {errors[key] && (
                    <span id={`f-${key}-error`} className="ml-7 block text-xs text-red-600">
                      {errors[key]}
                    </span>
                  )}
                </div>
              ))}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-5 py-2.5 text-sm font-medium text-bg-primary disabled:opacity-60"
              >
                {busy === 'company' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save and continue
              </button>
              {companyDone && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(savedForm);
                    setErrors({});
                    setEditingCompany(false);
                  }}
                  className="text-sm text-ink-secondary underline"
                >
                  Discard changes
                </button>
              )}
              {dirty && <span className="text-xs text-amber-700">You have unsaved changes.</span>}
            </div>
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
                  {editable && (
                    <UploadButton label={kind.label} busy={busy === `upload:${kind.kind}`} disabled={busy !== null} onFile={(f) => void upload(kind.kind, f)} />
                  )}
                </div>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((file) => (
                      <li key={file.id} className="text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-ink-primary">
                            <FileText
                              className={cn('h-4 w-4 shrink-0', file.reviewStatus === 'rejected' ? 'text-red-600' : 'text-emerald-600')}
                              aria-hidden
                            />
                            <span className="truncate">{file.filename}</span>
                            {file.reviewStatus === 'accepted' && <span className="text-xs text-emerald-700">Accepted</span>}
                            {file.reviewStatus === 'rejected' && <span className="text-xs text-red-700">Needs replacing</span>}
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              aria-label={`Download ${file.filename}`}
                              disabled={busy !== null}
                              onClick={() => void downloadDocument(file.id, file.filename)}
                              className="text-ink-secondary hover:text-ink-primary"
                            >
                              {busy === `download:${file.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                            </button>
                            {editable && (
                              <button
                                type="button"
                                aria-label={`Remove ${file.filename}`}
                                disabled={busy !== null}
                                onClick={() => void removeDocument(file.id, file.filename)}
                                className="text-ink-secondary hover:text-red-600"
                              >
                                {busy === `delete:${file.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                              </button>
                            )}
                          </span>
                        </div>
                        {file.reviewStatus === 'rejected' && file.reviewNote && (
                          <p className="ml-6 mt-1 text-xs text-red-700">Ensaar: {file.reviewNote}. Upload a replacement, then remove this one.</p>
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
      {!signed && (
        <section className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5 print:hidden md:p-6">
          <StepHeader
            n={3}
            title="Verify the signatory"
            done={verified}
            subtitle={view.company ? `We confirm ${view.company.signatoryName} controls ${view.company.signatoryEmail}.` : 'Available once your company details are saved.'}
          />
          {!view.company ? null : verified ? (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <MailCheck className="h-4 w-4" aria-hidden /> {view.company.signatoryName} is verified.
            </p>
          ) : !view.signatory.emailAvailable ? (
            <p className="text-sm text-ink-secondary">
              Ensaar will confirm the signatory with you directly (usually a short call). You will be able to sign as soon as
              that is done.
            </p>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                disabled={busy !== null || dirty}
                onClick={() => void sendCode()}
                className="inline-flex items-center gap-2 rounded-lg border border-line-subtle px-4 py-2 text-sm text-ink-primary disabled:opacity-60"
              >
                {busy === 'code-send' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {codeSentTo ? 'Send a new code' : `Email a code to ${view.company.signatoryEmail}`}
              </button>
              {codeSentTo && (
                <form onSubmit={checkCode} className="flex flex-wrap items-end gap-3">
                  <div className="text-sm">
                    <label htmlFor="verify-code" className="mb-1 block font-medium text-ink-primary">
                      6-digit code
                    </label>
                    <input
                      id="verify-code"
                      className={cn(input, 'w-36 tracking-widest')}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={code.length !== 6 || busy !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-50"
                  >
                    {busy === 'code-check' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Verify
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      )}

      {/* Step 4 */}
      <section className="space-y-5 rounded-xl border border-line-subtle bg-bg-primary p-5 md:p-6 print:border-0 print:p-0">
        <div className="print:hidden">
          <StepHeader
            n={signed ? 3 : 4}
            title={signed ? 'Your agreement' : 'Review and sign'}
            done={signed}
            subtitle={signed ? 'Your signed copy. Use Print to save it as a PDF.' : 'The Employer of Record services agreement, filled in from the steps above.'}
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
            {signBlocked ? (
              <p className="text-sm text-ink-secondary" role="status">
                {signBlocked}
              </p>
            ) : (
              <>
                <div className="text-sm">
                  <label htmlFor="sign-name" className="mb-1 block font-medium text-ink-primary">
                    Type {signatory} to sign
                  </label>
                  <input
                    id="sign-name"
                    aria-describedby="sign-name-hint"
                    className={cn(input, 'font-serif text-lg italic')}
                    value={signName}
                    onChange={(e) => setSignName(e.target.value)}
                    placeholder={signatory}
                    autoComplete="off"
                  />
                  <span id="sign-name-hint" className="mt-1 block text-xs text-ink-secondary">
                    Your typed name is your signature.
                  </span>
                </div>
                <label className="flex items-start gap-3 text-sm text-ink-primary">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    I have read the agreement above, I am authorised to sign it for {view.company?.legalName}, and I agree to
                    sign electronically.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!canSign}
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

function UploadButton({ label, busy, disabled, onFile }: { label: string; busy: boolean; disabled: boolean; onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        aria-label={`Upload ${label}`}
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
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line-subtle px-3 py-1.5 text-sm text-ink-primary hover:bg-bg-secondary disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        Upload
      </button>
    </>
  );
}

/** A dead link is not a dead end: the customer can get a fresh one by email. */
function InvalidLink({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line-subtle bg-bg-primary p-8">
      <ShieldAlert className="h-8 w-8 text-ink-secondary" aria-hidden />
      <p className="mt-3 text-ink-primary">{message}</p>
      <RecoverForm />
    </div>
  );
}

export function RecoverForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; text?: string }>({ kind: 'idle' });
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setState({ kind: 'busy' });
        try {
          const response = await fetch('/api/onboard/recover', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Please try again.');
          setState({ kind: 'done', text: data.message });
        } catch (cause) {
          setState({ kind: 'error', text: cause instanceof Error ? cause.message : 'Please try again.' });
        }
      }}
    >
      <label htmlFor="recover-email" className="block text-sm font-medium text-ink-primary">
        Get a new link by email
      </label>
      <p className="text-xs text-ink-secondary">Use the address the onboarding was sent to, or the signatory&apos;s address.</p>
      <div className="flex flex-wrap gap-2">
        <input
          id="recover-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary"
        />
        <button
          type="submit"
          disabled={state.kind === 'busy'}
          className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
        >
          {state.kind === 'busy' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Email me a link
        </button>
      </div>
      <p aria-live="polite" className={cn('text-sm', state.kind === 'error' ? 'text-red-600' : 'text-emerald-700')}>
        {state.kind === 'done' || state.kind === 'error' ? state.text : ''}
      </p>
      <p className="text-xs text-ink-secondary">
        Still stuck? Write to <a href="mailto:support@ensaar.com" className="underline">support@ensaar.com</a>.
      </p>
    </form>
  );
}
