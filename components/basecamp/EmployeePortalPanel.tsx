'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, FileText, Loader2, MailPlus, X } from 'lucide-react';
import type { Holiday, HolidayPlanStatus } from '@/lib/eor/holidays';
import { HOLIDAY_PLAN_LABELS } from '@/lib/eor/holidays';
import { formatDay, formatInr } from '@/lib/eor/onboarding';
import type { Regime, TaxDeclarations, TaxEstimate } from '@/lib/eor/tax';
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveStatus, type LeaveType } from '@/lib/eor/leave';
import { CONDUCT_REASONS, CONDUCT_STEPS, NEEDS_REPLY, canTerminate, type ConductReason, type ConductStep, type LetterStep } from '@/lib/eor/conduct';
import { DECLARATION_FIELDS } from '@/lib/eor/tax';
import { Badge, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type PortalDoc = { id: string; kind: 'offer' | 'agreement'; status: 'sent' | 'signed' | 'void'; issuedBy: string | null; issuedAt: string; signedAt: string | null; signedName: string | null; voidReason: string | null };
export type PortalData = {
  documents: PortalDoc[];
  records: {
    bank: { holderName: string; accountNumber: string; ifsc: string; updatedAt: string } | null;
    files: Array<{ id: string; kind: 'bank_proof' | 'relieving_letter'; filename: string; uploadedAt: string }>;
    noPreviousEmployer: boolean;
    outstanding: { received: string[]; needed: Array<{ key: string; label: string; detail: string }> };
  };
  leave: {
    year: number;
    balance: { earned: number; adjusted: number; taken: number; waiting: number; left: number };
    encashable: number;
    requests: Array<{ id: string; type: LeaveType; from: string; to: string; days: number; unpaidDays: number; status: LeaveStatus; decidedBy: string | null; decidedAs: string | null }>;
    adjustments: Array<{ id: string; year: number; days: number; reason: string; createdBy: string; createdAt: string }>;
  };
  conduct: Array<{
    id: string; reason: ConductReason; source: 'client' | 'ensaar'; summary: string; status: 'open' | 'closed'; clientOutcome: string | null;
    openedBy: string; openedAt: string; closedAt: string | null;
    events: Array<{ id: string; step: ConductStep; text: string; issuedBy: string; issuedAt: string; responseDue: string | null; acknowledgedAt: string | null; replyText: string | null; repliedAt: string | null }>;
  }>;
  handbook: { current: { version: string } | null; acknowledged: { version: string; at: string } | null; pending: boolean; nightWork: { consented: boolean; at: string } | null };
  tax: { taxYear: string; regime: Regime; declarations: TaxDeclarations; updatedAt: string | null; comparison: { new: TaxEstimate; old: TaxEstimate; lower: Regime; saving: number } };
  holidays: { year: number; chosen: Holiday[]; catalogue: Holiday[]; allowed: number; plan: { status: HolidayPlanStatus; note: string | null; proposedName: string | null; decidedBy: string | null; decidedRole: 'client' | 'ensaar' | null; submittedAt: string | null } };
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
  legalName,
  givenName,
  hasEmail,
  canInvite,
  named,
  data,
  act,
}: {
  employeeId: string;
  legalName: string;
  givenName: string | null;
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
      {!canInvite && <p className="text-xs text-ink-secondary">The employee hears nothing from Ensaar until the client has signed the agreement and this Schedule A has been sent to them. Documents and the portal open then.</p>}
      {!hasEmail && <p className="text-xs text-amber-700">Add the employee&apos;s email address (edit the offer) to issue documents or invite them: they sign in with it.</p>}
      {link && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-bg-secondary p-2 text-xs text-ink-secondary">
          {link.emailed ? 'Emailed to the employee.' : 'Email is off, so nothing was sent.'}
          <button type="button" className="inline-flex items-center gap-1 underline" onClick={async () => { await navigator.clipboard.writeText(link.url).catch(() => undefined); setLink({ ...link, copied: true }); }}>
            {link.copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />} {link.copied ? 'Copied' : 'Copy the portal address'}
          </button>
          They sign in there with their email address.
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Documents</h3>
        <GreetingField legalName={legalName} givenName={givenName} named={named} act={act} />
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
                    disabled={!named || !hasEmail || !canInvite || busy !== null}
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

      <LeaveSection leave={data.leave} named={named} act={act} />

      <ConductSection cases={data.conduct} named={named} act={act} />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Handbook and consents</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-secondary">Employee Handbook</dt>
            <dd>
              {!data.handbook.current
                ? 'Not published yet'
                : data.handbook.pending
                  ? `Version ${data.handbook.current.version} not acknowledged yet`
                  : `Version ${data.handbook.acknowledged!.version} acknowledged ${formatDay(data.handbook.acknowledged!.at)}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Work after 8:30 pm</dt>
            <dd>{data.handbook.nightWork ? `${data.handbook.nightWork.consented ? 'Consented' : 'Withdrew consent'} ${formatDay(data.handbook.nightWork.at)}` : 'Not given'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Bank and records</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-ink-secondary">Salary account</dt><dd>{data.records.bank ? `${data.records.bank.holderName} · ${data.records.bank.accountNumber} · ${data.records.bank.ifsc}` : 'Not given yet'}</dd></div>
          <div><dt className="text-xs text-ink-secondary">Relieving letter</dt><dd>{data.records.files.some((f) => f.kind === 'relieving_letter') ? 'Received' : data.records.noPreviousEmployer ? 'First job: none due' : 'Not given yet'}</dd></div>
        </dl>
        {data.records.files.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {data.records.files.map((f) => (
              <li key={f.id}><a className="underline" href={`/api/basecamp/employee-files/${f.id}`} target="_blank" rel="noopener">{f.kind === 'bank_proof' ? 'Bank proof' : 'Relieving letter'}: {f.filename}</a> <span className="text-xs text-ink-secondary">{formatDay(f.uploadedAt)}</span></li>
            ))}
          </ul>
        )}
        {data.records.outstanding.needed.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">Still needed (reminded Mondays and Thursdays): {data.records.outstanding.needed.map((n) => n.label).join(', ')}.</p>
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
          Client holiday calendar, {holidays.year} <Badge tone={holidays.plan.status === 'approved' ? 'good' : holidays.plan.status === 'rejected' ? 'bad' : holidays.plan.status === 'submitted' ? 'info' : 'neutral'}>{HOLIDAY_PLAN_LABELS[holidays.plan.status]}</Badge>
        </h3>
        {holidays.chosen.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">No calendar yet. One of this client&apos;s employees proposes {holidays.allowed} holidays in the portal, on top of India&apos;s national holidays; once approved, they apply to all the client&apos;s employees.</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {holidays.chosen.map((h) => <li key={h.id}>{h.name} <span className="text-xs text-ink-secondary">{formatDay(h.date)} · {h.country === 'IN' ? 'India' : 'US'}</span></li>)}
          </ul>
        )}
        {holidays.plan.proposedName && <p className="mt-1 text-xs text-ink-secondary">Proposed by {holidays.plan.proposedName}. Shared by every employee of this client.</p>}
        {holidays.plan.decidedBy && (
          <p className="mt-1 text-xs text-ink-secondary">
            {holidays.plan.status === 'approved' ? 'Approved' : 'Changes asked'} by {holidays.plan.decidedBy} ({holidays.plan.decidedRole === 'ensaar' ? 'Ensaar' : 'client'}){holidays.plan.note ? `: ${holidays.plan.note}` : ''}
          </p>
        )}
        {holidays.plan.status !== 'draft' && named && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-ink-secondary">Ensaar can decide instead of the client. This overrides the client&apos;s decision, applies to all the client&apos;s employees, and emails them.</p>
            <div className="flex flex-wrap gap-2">
              {holidays.plan.status !== 'approved' && (
                <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-2.5 py-1 text-xs text-emerald-700')} onClick={() => window.confirm("Approve this calendar for all of this client's employees, overriding the client?") && void run({ action: 'holiday_decision', year: holidays.year, decision: 'approved' }, 'approve', 'Holidays approved by Ensaar.')}>
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
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (ev) => { ev.preventDefault(); if (await run({ action: 'holiday_decision', year: holidays.year, decision: 'rejected', note: rejecting }, 'reject', 'Calendar reopened; the employee who proposed it is emailed your note.')) setRejecting(null); }}>
                <input autoFocus className={inputClass} placeholder="What should change?" value={rejecting} onChange={(ev) => setRejecting(ev.target.value)} aria-label="What should change?" />
                <button type="submit" disabled={rejecting.trim().length < 3 || busy !== null} className={cn(buttonClass, 'text-red-700')}>Send</button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** The given name the documents greet the employee by, e.g. "Dear Lakshmi" for Pulla Lakshmi. */
function GreetingField({ legalName, givenName, named, act }: { legalName: string; givenName: string | null; named: boolean; act: (payload: Record<string, unknown>, label: string, success?: string) => Promise<Record<string, unknown> | null> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(givenName ?? '');
  const greeting = givenName || legalName.trim().split(/\s+/)[0];
  if (!editing) {
    return (
      <p className="mt-1 text-xs text-ink-secondary">
        Documents greet them as &ldquo;Dear {greeting}&rdquo;.{' '}
        {named && (
          <button type="button" className="underline hover:text-ink-primary" onClick={() => setEditing(true)}>
            Change the given name
          </button>
        )}
      </p>
    );
  }
  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await act({ action: 'given_name', givenName: value }, 'given_name', 'Given name saved. Re-issue a document for it to take effect.')) setEditing(false);
      }}
    >
      <input className={cn(inputClass, 'sm:max-w-xs')} aria-label="Given name" placeholder={legalName.trim().split(/\s+/)[0]} value={value} onChange={(e) => setValue(e.target.value)} />
      <span className="text-xs text-ink-secondary">If it is not the first word of the legal name ({legalName}). Blank uses the first word.</span>
      <span className="flex gap-2">
        <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Save</button>
        <button type="button" className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setEditing(false)}>Cancel</button>
      </span>
    </form>
  );
}

/** Paid leave for the year, the requests behind it, and adjustments (opening balance, encashment, correction). */
function LeaveSection({ leave, named, act }: { leave: PortalData['leave']; named: boolean; act: (payload: Record<string, unknown>, label: string, success?: string) => Promise<Record<string, unknown> | null> }) {
  const [form, setForm] = useState<{ days: string; reason: string } | null>(null);
  const b = leave.balance;
  const inYear = leave.requests.filter((r) => r.from.startsWith(String(leave.year)));
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Leave in {leave.year}</h3>
      <p className="mt-2 text-sm text-ink-primary">
        {b.left} days of paid leave left: earned {b.earned}
        {b.adjusted ? `, adjusted ${b.adjusted > 0 ? '+' : ''}${b.adjusted}` : ''}, taken {b.taken}, waiting {b.waiting}. Encashable at year end: {leave.encashable}.
      </p>
      {inYear.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {inYear.slice(0, 8).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-ink-secondary">
              <span className="text-ink-primary">{LEAVE_TYPES[r.type]}</span>
              {r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} to ${formatDay(r.to)}`} · {r.days}d{r.unpaidDays && r.type !== 'unpaid' ? ` (${r.unpaidDays} unpaid)` : ''}
              <Badge tone={r.status === 'approved' ? 'good' : r.status === 'pending' ? 'attention' : 'neutral'}>
                {r.decidedAs === 'auto' ? 'Recorded' : LEAVE_STATUSES[r.status]}
                {r.decidedBy && r.decidedAs !== 'auto' ? ` by ${r.decidedBy}` : ''}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {leave.adjustments.filter((a) => a.year === leave.year).map((a) => (
        <p key={a.id} className="mt-1 text-xs text-ink-secondary">
          Adjusted {a.days > 0 ? '+' : ''}{a.days} days: {a.reason} ({a.createdBy}, {formatDay(a.createdAt)})
        </p>
      ))}
      {named && !form && (
        <button type="button" className="mt-2 text-xs text-ink-secondary underline hover:text-ink-primary" onClick={() => setForm({ days: '', reason: '' })}>
          Adjust the balance
        </button>
      )}
      {form && (
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: 'leave_adjust', year: leave.year, days: Number(form.days), reason: form.reason }, 'leave_adjust', 'Balance adjusted.')) setForm(null);
          }}
        >
          <input className={cn(inputClass, 'sm:w-28')} aria-label="Days" placeholder="Days, e.g. -5" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          <input className={inputClass} aria-label="Reason" placeholder="Reason, e.g. Encashed at year end" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <span className="flex gap-2">
            <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Save</button>
            <button type="button" className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setForm(null)}>Cancel</button>
          </span>
        </form>
      )}
    </div>
  );
}

type Act = (payload: Record<string, unknown>, label: string, success?: string) => Promise<Record<string, unknown> | null>;
const LETTERS: LetterStep[] = ['written_warning', 'final_warning', 'show_cause', 'suspension', 'abandonment', 'termination'];

/**
 * Corrective action (handbook section 14): cases, notes and verbal warnings on
 * file, and letters issued in the signatory's name. Only Ensaar acts.
 */
function ConductSection({ cases, named, act }: { cases: PortalData['conduct']; named: boolean; act: Act }) {
  const [opening, setOpening] = useState<{ reason: ConductReason; summary: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const allEvents = cases.flatMap((c) => c.events);
  const termination = canTerminate(allEvents.map((e) => ({ step: e.step, issuedAt: e.issuedAt, responseDue: e.responseDue, repliedAt: e.repliedAt })), today);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Conduct and performance</h3>
        {named && !opening && (
          <button type="button" className="text-xs text-ink-secondary underline hover:text-ink-primary" onClick={() => setOpening({ reason: 'performance', summary: '' })}>
            Open a case
          </button>
        )}
      </div>
      {cases.length === 0 && !opening && <p className="mt-2 text-sm text-ink-secondary">Nothing on file.</p>}
      {opening && (
        <form
          className="mt-2 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: 'conduct_open', ...opening }, 'conduct_open', 'Case opened.')) setOpening(null);
          }}
        >
          <select className={inputClass} value={opening.reason} onChange={(e) => setOpening({ ...opening, reason: e.target.value as ConductReason })} aria-label="About">
            {(Object.keys(CONDUCT_REASONS) as ConductReason[]).map((r) => <option key={r} value={r}>{CONDUCT_REASONS[r]}</option>)}
          </select>
          <input className={inputClass} placeholder="What the case is about (staff only)" value={opening.summary} onChange={(e) => setOpening({ ...opening, summary: e.target.value })} />
          <span className="flex gap-2">
            <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Open</button>
            <button type="button" className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setOpening(null)}>Cancel</button>
          </span>
        </form>
      )}
      <ul className="mt-2 space-y-3">
        {cases.map((c) => (
          <CaseCard key={c.id} item={c} named={named} act={act} termination={termination} />
        ))}
      </ul>
    </div>
  );
}

/** A letter's first line of substance (past its title, date, addressee and role), to summarise it. */
const firstLine = (text: string, fallback: string) =>
  text.split('\n').find((l) => l.trim() && !/^[A-Z ,-]+$/.test(l) && !/^(Date|To|Role):/.test(l))?.slice(0, 120) ?? fallback;

function CaseCard({ item, named, act, termination }: { item: PortalData['conduct'][number]; named: boolean; act: Act; termination: { ok: true } | { ok: false; reason: string } }) {
  const [mode, setMode] = useState<'note' | 'letter' | 'close' | null>(null);
  const [note, setNote] = useState({ step: 'note' as 'note' | 'verbal_warning', text: '' });
  const [letter, setLetter] = useState({ step: 'written_warning' as LetterStep, details: '', expectation: '', dueDate: '', lastDay: '', basis: 'notice' });
  const [close, setClose] = useState({ clientOutcome: '', note: '' });
  const warning = letter.step === 'written_warning' || letter.step === 'final_warning';
  return (
    <li className="rounded-lg border border-line-subtle p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink-primary">{CONDUCT_REASONS[item.reason]}</span>
        <Badge tone={item.status === 'open' ? 'attention' : 'neutral'}>{item.status === 'open' ? 'Open' : `Closed ${formatDay(item.closedAt!)}`}</Badge>
        <span className="text-xs text-ink-secondary">{item.source === 'client' ? 'Raised by the client' : `Opened by ${item.openedBy}`}, {formatDay(item.openedAt)}</span>
      </div>
      <p className="mt-1 text-ink-secondary">{item.summary}</p>
      <ol className="mt-2 space-y-2 border-l border-line-subtle pl-3">
        {item.events.map((e) => (
          <li key={e.id}>
            <p className="text-xs text-ink-secondary">
              {CONDUCT_STEPS[e.step].label} · {formatDay(e.issuedAt)} · {e.issuedBy}
              {e.responseDue ? ` · reply by ${formatDay(e.responseDue)}` : ''}
            </p>
            <details>
              <summary className="cursor-pointer text-ink-primary">{firstLine(e.text, CONDUCT_STEPS[e.step].label)}</summary>
              <p className="mt-1 whitespace-pre-line text-ink-secondary">{e.text}</p>
            </details>
            {CONDUCT_STEPS[e.step].letter && (
              <p className="text-xs text-ink-secondary">
                {e.repliedAt ? `Replied ${formatDay(e.repliedAt)}` : e.acknowledgedAt ? `Acknowledged ${formatDay(e.acknowledgedAt)}` : 'Not yet opened by the employee'}
              </p>
            )}
            {e.replyText && <p className="mt-1 whitespace-pre-line rounded bg-bg-secondary p-2 text-ink-primary">Reply: {e.replyText}</p>}
          </li>
        ))}
      </ol>
      {item.clientOutcome && <p className="mt-2 text-xs text-ink-secondary">The client was told: {item.clientOutcome}</p>}
      {named && item.status === 'open' && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <button type="button" className="text-ink-secondary underline hover:text-ink-primary" onClick={() => setMode(mode === 'note' ? null : 'note')}>Add a note or verbal warning</button>
          <button type="button" className="text-ink-secondary underline hover:text-ink-primary" onClick={() => setMode(mode === 'letter' ? null : 'letter')}>Issue a letter</button>
          <button type="button" className="text-ink-secondary underline hover:text-ink-primary" onClick={() => setMode(mode === 'close' ? null : 'close')}>Close the case</button>
        </div>
      )}
      {mode === 'note' && (
        <form
          className="mt-2 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: 'conduct_note', caseId: item.id, ...note }, 'conduct_note', 'Added to the file.')) setMode(null);
          }}
        >
          <select className={inputClass} value={note.step} onChange={(e) => setNote({ ...note, step: e.target.value as 'note' | 'verbal_warning' })} aria-label="Kind">
            <option value="note">Note (staff only)</option>
            <option value="verbal_warning">Verbal warning given (noted on file)</option>
          </select>
          <textarea className="min-h-20 w-full rounded-lg border border-line-subtle bg-bg-primary p-2 text-sm" placeholder="What was said or decided" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} />
          <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Save</button>
        </form>
      )}
      {mode === 'letter' && (
        <form
          className="mt-2 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: 'conduct_letter', caseId: item.id, ...letter }, 'conduct_letter', 'Letter issued and emailed to the employee from HR.')) setMode(null);
          }}
        >
          <select className={inputClass} value={letter.step} onChange={(e) => setLetter({ ...letter, step: e.target.value as LetterStep })} aria-label="Letter">
            {LETTERS.map((l) => <option key={l} value={l}>{CONDUCT_STEPS[l].label}</option>)}
          </select>
          {letter.step === 'termination' && !termination.ok && <p className="text-xs text-red-600">{termination.reason}</p>}
          <textarea
            className="min-h-24 w-full rounded-lg border border-line-subtle bg-bg-primary p-2 text-sm"
            placeholder={letter.step === 'termination' ? 'The reasons, as the employee will read them' : 'What happened, as the employee will read it'}
            value={letter.details}
            onChange={(e) => setLetter({ ...letter, details: e.target.value })}
          />
          {warning && <input className={inputClass} placeholder="What needs to change" value={letter.expectation} onChange={(e) => setLetter({ ...letter, expectation: e.target.value })} />}
          {(warning || NEEDS_REPLY.includes(letter.step)) && (
            <label className="block text-xs text-ink-secondary">
              {warning ? 'Review on or after (optional)' : 'Reply by (default: 3 working days)'}
              <input type="date" className={inputClass} value={letter.dueDate} onChange={(e) => setLetter({ ...letter, dueDate: e.target.value })} />
            </label>
          )}
          {letter.step === 'termination' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <select className={inputClass} value={letter.basis} onChange={(e) => setLetter({ ...letter, basis: e.target.value })} aria-label="Basis">
                <option value="notice">With notice</option>
                <option value="pay_in_lieu">Pay in place of notice</option>
                <option value="serious_misconduct">Serious misconduct, without notice</option>
              </select>
              <input type="date" className={inputClass} aria-label="Last working day" value={letter.lastDay} onChange={(e) => setLetter({ ...letter, lastDay: e.target.value })} />
            </div>
          )}
          <p className="text-xs text-ink-secondary">
            Issued in the authorised signatory&apos;s name, emailed from HR with a PDF, and shown in the employee&apos;s portal. Record the exit separately if employment ends.
          </p>
          <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Issue letter</button>
        </form>
      )}
      {mode === 'close' && (
        <form
          className="mt-2 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: 'conduct_close', caseId: item.id, ...close }, 'conduct_close', 'Case closed.')) setMode(null);
          }}
        >
          <input className={inputClass} placeholder="Outcome (staff only)" value={close.note} onChange={(e) => setClose({ ...close, note: e.target.value })} />
          {item.source === 'client' && (
            <input className={inputClass} placeholder="What the client is told (optional, e.g. Addressed with the employee)" value={close.clientOutcome} onChange={(e) => setClose({ ...close, clientOutcome: e.target.value })} />
          )}
          <button type="submit" className={cn(buttonClass, 'px-3 py-1.5')}>Close case</button>
        </form>
      )}
    </li>
  );
}
