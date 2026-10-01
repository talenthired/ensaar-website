'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { US_STATES, formatDay, signatureMatches } from '@/lib/eor/onboarding';
import { MAX_OWNERS } from '@/lib/eor/ownership';
import { OWNERSHIP_THRESHOLD_PERCENT } from '@/lib/eor/outstanding';
import type { CompanyView } from '@/lib/eor/views';
import { buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { apiError, type Say } from './CompanySetup';

/**
 * What Ensaar still needs from the company, with the small fields filled in
 * right here. Nothing in it blocks signing or hiring; it is reminded twice a week.
 */
export function StillNeeded({ view, onSaved, onOpenDocuments, say }: { view: CompanyView; onSaved: (v: CompanyView) => void; onOpenDocuments: () => void; say: Say }) {
  const needed = view.outstanding.needed;
  const keys = new Set(needed.map((n) => n.key));
  const [form, setForm] = useState({ signatoryTitle: '', billingEmail: '', incorporationState: '' });
  const [busy, setBusy] = useState(false);
  if (needed.length === 0) return null;
  const detailKeys = ['signatory_title', 'billing_email', 'formation_state'].filter((k) => keys.has(k));

  async function save() {
    setBusy(true);
    try {
      const response = await fetch('/api/portal/details', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error(await apiError(response, 'Unable to save.'));
      onSaved(await response.json());
      setForm({ signatoryTitle: '', billingEmail: '', incorporationState: '' });
      say('ok', 'Saved. Thank you.');
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div>
        <h2 className="text-sm font-semibold text-ink-primary">Still needed from {view.name}</h2>
        <p className="mt-1 text-sm text-ink-secondary">You can carry on while these are outstanding. We need them before your first payroll, and remind you every Monday and Thursday until they are in.</p>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-primary">
        {needed.map((n) => (
          <li key={n.key}>{n.detail}</li>
        ))}
      </ul>
      {detailKeys.length > 0 && (
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {keys.has('signatory_title') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">{view.signatory?.name}&apos;s title</span>
              <input id="missing-title" className={inputClass} placeholder="CEO" value={form.signatoryTitle} onChange={(e) => setForm((f) => ({ ...f, signatoryTitle: e.target.value }))} />
            </label>
          )}
          {keys.has('billing_email') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">Billing email</span>
              <input id="missing-billing" type="email" className={inputClass} placeholder="accounts@company.com" value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} />
            </label>
          )}
          {keys.has('formation_state') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">State where it was formed</span>
              <select id="missing-state" className={inputClass} value={form.incorporationState} onChange={(e) => setForm((f) => ({ ...f, incorporationState: e.target.value }))}>
                <option value="">Choose…</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="sm:col-span-3">
            <button type="submit" disabled={busy || !(form.signatoryTitle || form.billingEmail || form.incorporationState)} className={primaryButtonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
            </button>
          </div>
        </form>
      )}
      {(keys.has('formation') || keys.has('ownership')) && (
        <button type="button" onClick={onOpenDocuments} className={buttonClass}>
          {keys.has('formation') && keys.has('ownership') ? 'Upload the document and declare ownership' : keys.has('formation') ? 'Upload the document' : 'Declare ownership'}
        </button>
      )}
    </section>
  );
}

type OwnerRow = { fullName: string; dateOfBirth: string; country: string; percent: string };
const EMPTY_OWNER: OwnerRow = { fullName: '', dateOfBirth: '', country: 'United States', percent: '' };

/** The beneficial ownership declaration: who owns or controls 25% or more, signed by the person signed in. */
export function OwnershipDeclaration({ view, onSaved, say }: { view: CompanyView; onSaved: (v: CompanyView) => void; say: Say }) {
  const declared = view.ownership;
  const [editing, setEditing] = useState(!declared);
  const [owners, setOwners] = useState<OwnerRow[]>([{ ...EMPTY_OWNER }]);
  const [noLargeOwner, setNoLargeOwner] = useState(false);
  const [controller, setController] = useState({ fullName: '', title: '' });
  const [signature, setSignature] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const signer = view.me.name ?? '';
  const nameOk = signer ? signatureMatches(signature, signer) : signature.trim().length >= 3;

  async function submit() {
    setBusy(true);
    setErrors({});
    try {
      const response = await fetch('/api/portal/ownership', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ owners, noLargeOwner, controller, signature, consent }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        if (json.errors) setErrors(json.errors);
        throw new Error(json.error || 'Unable to save.');
      }
      onSaved(await response.json());
      setEditing(false);
      say('ok', 'Ownership declaration signed. Thank you.');
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }

  if (!editing && declared) {
    return (
      <div className="space-y-2 rounded-lg border border-line-subtle p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-ink-primary">
          <Check className="h-4 w-4 text-emerald-600" aria-hidden /> Declared by {declared.declaredName} on {formatDay(declared.declaredAt)}
        </p>
        {declared.noLargeOwner ? (
          <p className="text-ink-secondary">Nobody owns or controls {OWNERSHIP_THRESHOLD_PERCENT}% or more. Control: {declared.controller?.fullName}, {declared.controller?.title}.</p>
        ) : (
          <ul className="list-disc pl-5 text-ink-secondary">
            {declared.owners.map((o) => (
              <li key={o.fullName}>{o.fullName}, {o.country}, {o.percent}%</li>
            ))}
          </ul>
        )}
        <button type="button" className={buttonClass} onClick={() => setEditing(true)}>Make a new declaration</button>
      </div>
    );
  }

  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>;
  return (
    <form
      noValidate
      className="space-y-4 rounded-lg border border-line-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm text-ink-secondary">
        List each person who owns or controls {OWNERSHIP_THRESHOLD_PERCENT}% or more of {view.name}, directly or indirectly. If nobody does, tick the box and name the person who controls it.
      </p>
      <label className="flex items-center gap-2 text-sm text-ink-primary">
        <input id="no-large-owner" type="checkbox" checked={noLargeOwner} onChange={(e) => setNoLargeOwner(e.target.checked)} />
        Nobody owns or controls {OWNERSHIP_THRESHOLD_PERCENT}% or more
      </label>
      {noLargeOwner ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Who controls the company</span>
            <input className={inputClass} value={controller.fullName} onChange={(e) => setController((c) => ({ ...c, fullName: e.target.value }))} />
            {err('controller.fullName')}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Their title</span>
            <input className={inputClass} placeholder="Managing Member" value={controller.title} onChange={(e) => setController((c) => ({ ...c, title: e.target.value }))} />
            {err('controller.title')}
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {owners.map((o, i) => (
            <div key={i} className="grid gap-3 rounded-lg bg-bg-secondary p-3 sm:grid-cols-[2fr_1.2fr_1.2fr_0.8fr_auto] sm:items-start">
              {(
                [
                  ['fullName', 'Full legal name', 'text'],
                  ['dateOfBirth', 'Date of birth', 'date'],
                  ['country', 'Country they live in', 'text'],
                  ['percent', 'Share %', 'text'],
                ] as const
              ).map(([k, label, type]) => (
                <label key={k} className="block min-w-0 text-sm">
                  <span className="mb-1 block text-ink-secondary">{label}</span>
                  <input
                    id={`owner-${i}-${k}`}
                    type={type}
                    inputMode={k === 'percent' ? 'decimal' : undefined}
                    className={inputClass}
                    value={o[k]}
                    onChange={(e) => setOwners((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))}
                  />
                  {err(`owners.${i}.${k}`)}
                </label>
              ))}
              <button
                type="button"
                aria-label={`Remove owner ${i + 1}`}
                disabled={owners.length === 1}
                onClick={() => setOwners((rows) => rows.filter((_, j) => j !== i))}
                className={cn(buttonClass, 'self-end px-2 py-2')}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          {err('owners')}
          {owners.length < MAX_OWNERS && (
            <button type="button" className={buttonClass} onClick={() => setOwners((rows) => [...rows, { ...EMPTY_OWNER }])}>
              <Plus className="h-4 w-4" aria-hidden /> Add another person
            </button>
          )}
        </div>
      )}
      <div className="space-y-3 border-t border-line-subtle pt-4">
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Type {signer ? `your name, ${signer},` : 'your full name'} to sign</span>
          <input id="ownership-signature" className={cn(inputClass, 'font-serif text-lg italic')} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={signer} autoComplete="off" />
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-primary">
          <input id="ownership-consent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I confirm this is true and complete, that I am authorised to declare it for {view.name}, and that we will tell Ensaar within 30 days if it changes.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !consent || !nameOk} className={primaryButtonClass}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign the declaration
          </button>
          {declared && (
            <button type="button" className={buttonClass} onClick={() => setEditing(false)}>Cancel</button>
          )}
        </div>
      </div>
    </form>
  );
}
