'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ENTITY_TYPES, US_STATES, validateCompany, type CompanyDetails, type Errors } from '@/lib/eor/onboarding';
import { inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type CompanyFormValues = Record<string, string | boolean>;

const LABELS: Record<string, string> = {
  legalName: 'Legal company name', entityType: 'Entity type', incorporationState: 'State of incorporation', ein: 'EIN',
  website: 'Website', addressLine1: 'Street address', city: 'City', state: 'State', zip: 'ZIP', signatoryName: 'Signatory full name',
  signatoryTitle: 'Signatory title', signatoryEmail: 'Signatory email', billingEmail: 'Billing email',
  confirmsSanctions: 'Sanctions confirmation', confirmsNoContracting: 'Contracting confirmation',
};

/** The form's starting values: what is saved, else what is already known about the company and its contact. */
export function companyFormInitial(details: CompanyDetails | null, known: { companyName: string; personName: string | null; email: string }): CompanyFormValues {
  const c = details;
  return {
    legalName: c?.legalName ?? known.companyName,
    entityType: c?.entityType ?? '',
    incorporationState: c?.incorporationState ?? '',
    ein: c?.ein ?? '',
    addressLine1: c?.addressLine1 ?? '',
    addressLine2: c?.addressLine2 ?? '',
    city: c?.city ?? '',
    state: c?.state ?? '',
    zip: c?.zip ?? '',
    website: c?.website ?? '',
    signatoryName: c?.signatoryName ?? known.personName ?? '',
    signatoryTitle: c?.signatoryTitle ?? '',
    signatoryEmail: c?.signatoryEmail ?? known.email,
    billingEmail: c?.billingEmail ?? known.email,
    confirmsSanctions: Boolean(c),
    confirmsNoContracting: Boolean(c),
  };
}

/** The two declarations as the customer reads them; Basecamp words them as what the customer confirmed to staff. */
const CUSTOMER_CONFIRMATIONS = {
  legend: 'Please confirm',
  sanctions: 'The company, and anyone who owns or controls it, is not subject to US, UN, EU, UK or Indian sanctions.',
  noContracting:
    'Employees hired through Ensaar will not negotiate or sign contracts in the company\'s name. (If one will, for example in a sales role, tell us first: it affects your tax position in India.)',
};

/**
 * Company details, with a linked, focused error summary and a warning before
 * leaving unsaved edits. Used by the customer in the portal and by Ensaar staff
 * entering the details for a customer in Basecamp.
 *
 * `onSubmit` returns field errors to show, or null when saved; it throws for
 * anything else, which the caller reports.
 */
export function CompanyForm({
  initial,
  onSubmit,
  onCancel,
  confirmations = CUSTOMER_CONFIRMATIONS,
  submitLabel = 'Save company details',
}: {
  initial: CompanyFormValues;
  onSubmit: (form: CompanyFormValues) => Promise<Errors | null>;
  onCancel?: () => void;
  confirmations?: { legend: string; sanctions: string; noContracting: string };
  submitLabel?: string;
}) {
  const [form, setForm] = useState<CompanyFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

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
      const refused = await onSubmit(form);
      if (refused) showErrors(refused);
    } finally {
      setBusy(false);
    }
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
        {f('ein', 'EIN', { inputMode: 'numeric', placeholder: '12-3456789', hint: 'The 9-digit federal Employer Identification Number.' })}
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
        <legend className="mb-2 text-sm font-semibold text-ink-primary">{confirmations.legend}</legend>
        {([
          ['confirmsSanctions', confirmations.sanctions],
          ['confirmsNoContracting', confirmations.noContracting],
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
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-ink-secondary underline">
            Discard changes
          </button>
        )}
        {dirty && <span className="text-xs text-amber-700">You have unsaved changes.</span>}
      </div>
    </form>
  );
}
