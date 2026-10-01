'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, FileText, Loader2, MailPlus, X } from 'lucide-react';
import type { Holiday, HolidayPlanStatus } from '@/lib/eor/holidays';
import { HOLIDAY_PLAN_LABELS } from '@/lib/eor/holidays';
import { formatDay, formatInr } from '@/lib/eor/onboarding';
import type { Regime, TaxDeclarations, TaxEstimate } from '@/lib/eor/tax';
import { DECLARATION_FIELDS } from '@/lib/eor/tax';
import { Badge, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type PortalDoc = { id: string; kind: 'offer' | 'agreement'; status: 'sent' | 'signed' | 'void'; issuedBy: string | null; issuedAt: string; signedAt: string | null; signedName: string | null; voidReason: string | null };
export type PortalData = {
  documents: PortalDoc[];
  tax: { taxYear: string; regime: Regime; declarations: TaxDeclarations; updatedAt: string | null; comparison: { new: TaxEstimate; old: TaxEstimate; lower: Regime; saving: number } };
  holidays: { year: number; chosen: Holiday[]; catalogue: Holiday[]; allowed: number; plan: { status: HolidayPlanStatus; note: string | null; decidedBy: string | null; decidedRole: 'client' | 'ensaar' | null; submittedAt: string | null } };
  emailConfigured: boolean;
};

const KINDS = [['offer', 'Offer letter'], ['agreement', 'Employment agreement']] as const;

/**
 * The employee portal as staff see it: issue documents for signature, invite the
 * employee in, see their tax choice, and decide their holidays over the client
 * if needed.
 */
export function EmployeePortalPanel({
  employeeId,
  hasEmail,
  canInvite,
  named,
  data,
  act,
}: {
  employeeId: string;
  hasEmail: boolean;
  canInvite: boolean;
  named: boolean;
  data: PortalData;
  act: (payload: Record<string, unknown>, label: string, success?: string) => Promise<Record<string, unknown> | null>;
}) {
  const [link, setLink] = useState<{ url: string; copied: boolean; emailed: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (payload: Record<string, unknown>, label: string, success: string) => {
    setBusy(label);
    const json = await act(payload, label, success);
    setBusy(null);
    if (json && typeof json.link === 'string') setLink({ url: json.link, copied: false, emailed: Boolean(json.emailConfigured) });
    return json;
  };
  const latest = (kind: 'offer' | 'agreement') => data.documents.find((d) => d.kind === kind && d.status !== 'void');
  const { tax, holidays } = data;
  const chosenTax = tax.comparison[tax.regime];
  const declared = DECLARATION_FIELDS.filter((f) => f.kind === 'amount' && Number(tax.declarations[f.key]) > 0);

  return (
    <section className="space-y-5 rounded-xl border border-line-subtle bg-bg-primary p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-ink-primary">Employee portal</h2>
        <button
          type="button"
          disabled={!named || !hasEmail || !canInvite || busy !== null}
          className={cn(buttonClass, 'px-3 py-1.5')}
          title={!hasEmail ? "Add the employee's email first" : undefined}
          onClick={() => void run({ action: 'invite_employee' }, 'invite', 'Invitation sent to the employee.')}
        >
          {busy === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MailPlus className="h-4 w-4" aria-hidden />} Invite to the portal
        </button>
      </div>
      {!hasEmail && <p className="text-xs text-amber-700">Add the employee&apos;s email address (edit the offer) to issue documents or invite them: they sign in with it.</p>}
      {link && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-secondary p-2 text-xs text-ink-secondary">
          {link.emailed ? 'Emailed to the employee.' : 'Email is off, so nothing was sent.'}
          <button type="button" className="inline-flex items-center gap-1 underline" onClick={async () => { await navigator.clipboard.writeText(link.url).catch(() => undefined); setLink({ ...link, copied: true }); }}>
            {link.copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />} {link.copied ? 'Copied' : 'Copy their sign-in link'}
          </button>
          It works once, for the employee only.
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Documents</h3>
        <ul className="mt-2 divide-y divide-line-subtle">
          {KINDS.map(([kind, label]) => {
            const doc = latest(kind);
            return (
              <li key={kind} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-ink-secondary" aria-hidden /> {label}
                  {!doc ? <Badge>Not issued</Badge> : doc.status === 'signed' ? <Badge tone="good">Signed {formatDay(doc.signedAt!)}</Badge> : <Badge tone="info">Sent {formatDay(doc.issuedAt)}, awaiting signature</Badge>}
                </span>
                <span className="flex flex-wrap gap-2">
                  <a href={`/api/basecamp/employees/${employeeId}/documents/${kind}`} target="_blank" rel="noopener" className={cn(buttonClass, 'px-2.5 py-1 text-xs')}>
                    <ExternalLink className="h-3 w-3" aria-hidden /> Preview
                  </a>
                  {doc && (
                    <a href={`/api/basecamp/employee-documents/${doc.id}`} target="_blank" rel="noopener" className={cn(buttonClass, 'px-2.5 py-1 text-xs')}>
                      <ExternalLink className="h-3 w-3" aria-hidden /> {doc.status === 'signed' ? 'Signed copy' : 'As issued'}
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={!named || !hasEmail || busy !== null}
                    className={cn(buttonClass, 'px-2.5 py-1 text-xs')}
                    onClick={() =>
                      (!doc || window.confirm(`Issue a new ${label.toLowerCase()}? The current one is voided (kept for the record)${doc.status === 'signed' ? ', and the employee signs again' : ''}.`)) &&
                      void run({ action: 'issue_document', kind }, `issue:${kind}`, `${label} issued and sent to the employee to sign.`)
                    }
                  >
                    {busy === `issue:${kind}` && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />} {doc ? 'Re-issue' : 'Issue for signature'}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {data.documents.some((d) => d.status === 'void') && (
          <details className="mt-1 text-xs text-ink-secondary">
            <summary className="cursor-pointer">Replaced documents, kept for the record</summary>
            <ul className="mt-1 space-y-0.5">
              {data.documents.filter((d) => d.status === 'void').map((d) => (
                <li key={d.id}><a className="underline" href={`/api/basecamp/employee-documents/${d.id}`} target="_blank" rel="noopener">{d.kind === 'offer' ? 'Offer letter' : 'Employment agreement'} of {formatDay(d.issuedAt)}</a>: {d.voidReason}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Tax, {tax.taxYear}</h3>
        <p className="mt-2 text-sm text-ink-primary">
          {tax.updatedAt ? `${tax.regime === 'new' ? 'New' : 'Old'} regime, chosen by the employee ${formatDay(tax.updatedAt)}.` : 'New regime (the default); the employee has not made a choice yet.'}{' '}
          Estimated TDS {formatInr(chosenTax.monthlyTds)} a month ({formatInr(chosenTax.totalTax)} for the year).
          {tax.comparison.saving > 0 && tax.comparison.lower !== tax.regime && <span className="text-amber-700"> The {tax.comparison.lower} regime would save them {formatInr(tax.comparison.saving)}.</span>}
        </p>
        {tax.regime === 'old' && declared.length > 0 && (
          <ul className="mt-1 grid gap-x-4 text-xs text-ink-secondary sm:grid-cols-2">
            {declared.map((f) => <li key={f.key}>{f.label}: {formatInr(Number(tax.declarations[f.key]))}</li>)}
          </ul>
        )}
      </div>

      <div>
        <h3 className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Holidays, {holidays.year} <Badge tone={holidays.plan.status === 'approved' ? 'good' : holidays.plan.status === 'rejected' ? 'bad' : holidays.plan.status === 'submitted' ? 'info' : 'neutral'}>{HOLIDAY_PLAN_LABELS[holidays.plan.status]}</Badge>
        </h3>
        {holidays.chosen.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">No holidays chosen yet. The employee chooses {holidays.allowed} in the portal, on top of India&apos;s national holidays.</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {holidays.chosen.map((h) => <li key={h.id}>{h.name} <span className="text-xs text-ink-secondary">{formatDay(h.date)} · {h.country === 'IN' ? 'India' : 'US'}</span></li>)}
          </ul>
        )}
        {holidays.plan.decidedBy && (
          <p className="mt-1 text-xs text-ink-secondary">
            {holidays.plan.status === 'approved' ? 'Approved' : 'Changes asked'} by {holidays.plan.decidedBy} ({holidays.plan.decidedRole === 'ensaar' ? 'Ensaar' : 'client'}){holidays.plan.note ? `: ${holidays.plan.note}` : ''}
          </p>
        )}
        {holidays.plan.status !== 'draft' && named && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-ink-secondary">Ensaar can decide instead of the client; this overrides the client&apos;s decision and emails the employee.</p>
            <div className="flex flex-wrap gap-2">
              {holidays.plan.status !== 'approved' && (
                <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-2.5 py-1 text-xs text-emerald-700')} onClick={() => window.confirm('Approve these holidays for the employee, overriding the client?') && void run({ action: 'holiday_decision', year: holidays.year, decision: 'approved' }, 'approve', 'Holidays approved by Ensaar.')}>
                  <Check className="h-3 w-3" aria-hidden /> Approve (override)
                </button>
              )}
              {holidays.plan.status !== 'rejected' && (
                <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-2.5 py-1 text-xs text-red-700')} onClick={() => setRejecting('')}>
                  <X className="h-3 w-3" aria-hidden /> Ask for changes (override)
                </button>
              )}
            </div>
            {rejecting !== null && (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (ev) => { ev.preventDefault(); if (await run({ action: 'holiday_decision', year: holidays.year, decision: 'rejected', note: rejecting }, 'reject', 'Sent back to the employee with your note.')) setRejecting(null); }}>
                <input autoFocus className={inputClass} placeholder="What should the employee change?" value={rejecting} onChange={(ev) => setRejecting(ev.target.value)} aria-label="Note to the employee" />
                <button type="submit" disabled={rejecting.trim().length < 3 || busy !== null} className={cn(buttonClass, 'text-red-700')}>Send</button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
