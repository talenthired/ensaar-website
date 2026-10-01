'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { US_STATES, formatDay } from '@/lib/eor/onboarding';
import type { OwnershipDeclaration } from '@/lib/eor/ownership-store';
import { OWNERSHIP_THRESHOLD_PERCENT, type OutstandingList } from '@/lib/eor/outstanding';
import { buttonClass, inputClass } from '@/components/eor/ui';

/**
 * What a client still owes Ensaar, as staff see it: the list the client is
 * reminded about every Monday and Thursday, fields to fill in what the client
 * sends by email, and the ownership declaration once made.
 */
export function ClientOutstanding({
  outstanding,
  ownership,
  named,
  act,
}: {
  outstanding: OutstandingList;
  ownership: OwnershipDeclaration | null;
  named: boolean;
  act: (payload: Record<string, unknown>, label: string, success?: string) => Promise<Record<string, unknown> | null>;
}) {
  const keys = new Set(outstanding.needed.map((n) => n.key));
  const [form, setForm] = useState({ signatoryTitle: '', billingEmail: '', incorporationState: '' });
  const [busy, setBusy] = useState(false);
  const hasDetailFields = ['signatory_title', 'billing_email', 'formation_state'].some((k) => keys.has(k));

  return (
    <section className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-5 lg:col-span-2">
      <h2 className="text-sm font-semibold text-ink-primary">
        Still to come from the client{' '}
        <span className="font-normal text-ink-secondary">{outstanding.needed.length ? `(${outstanding.needed.length}, reminded Mondays and Thursdays)` : ''}</span>
      </h2>
      {outstanding.needed.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" aria-hidden /> Everything is in.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-primary">
          {outstanding.needed.map((n) => <li key={n.key}><strong className="font-medium">{n.label}.</strong> <span className="text-ink-secondary">{n.detail}</span></li>)}
        </ul>
      )}
      {hasDetailFields && named && (
        <form
          className="grid gap-3 sm:grid-cols-4 sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const done = await act({ action: 'complete_details', details: form }, 'complete', 'Saved.');
            setBusy(false);
            if (done) setForm({ signatoryTitle: '', billingEmail: '', incorporationState: '' });
          }}
        >
          {keys.has('signatory_title') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">Signatory&apos;s title</span>
              <input className={inputClass} value={form.signatoryTitle} onChange={(e) => setForm((f) => ({ ...f, signatoryTitle: e.target.value }))} />
            </label>
          )}
          {keys.has('billing_email') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">Billing email</span>
              <input type="email" className={inputClass} value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} />
            </label>
          )}
          {keys.has('formation_state') && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-secondary">State of formation</span>
              <select className={inputClass} value={form.incorporationState} onChange={(e) => setForm((f) => ({ ...f, incorporationState: e.target.value }))}>
                <option value="">Choose…</option>
                {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
          )}
          <button type="submit" disabled={busy || !(form.signatoryTitle || form.billingEmail || form.incorporationState)} className={buttonClass}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save what the client sent
          </button>
        </form>
      )}
      {ownership && (
        <div className="rounded-lg bg-bg-secondary p-3 text-sm">
          <p className="font-medium text-ink-primary">Ownership declared by {ownership.declaredName} ({ownership.declaredEmail}), {formatDay(ownership.declaredAt)}</p>
          {ownership.noLargeOwner ? (
            <p className="text-ink-secondary">Nobody owns or controls {OWNERSHIP_THRESHOLD_PERCENT}% or more. Control: {ownership.controller?.fullName}, {ownership.controller?.title}.</p>
          ) : (
            <ul className="list-disc pl-5 text-ink-secondary">
              {ownership.owners.map((o) => <li key={o.fullName}>{o.fullName}, born {formatDay(o.dateOfBirth)}, {o.country}, {o.percent}%</li>)}
            </ul>
          )}
          <p className="mt-1 break-all text-xs text-ink-secondary">Fingerprint (SHA-256): {ownership.hash}</p>
        </div>
      )}
    </section>
  );
}
