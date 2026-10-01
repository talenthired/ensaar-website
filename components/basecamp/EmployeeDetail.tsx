'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Loader2, LogOut, Pencil, Send, UserCheck, XCircle } from 'lucide-react';
import type { EorEmployee } from '@/lib/eor/employees';
import { PricingFields } from './AddEmployees';
import type { VoidedSignature } from '@/lib/eor/companies';
import type { OutboxEntry } from '@/lib/notify/outbox';
import {
  EMPLOYEE_STATUS_LABELS,
  employeeSteps,
  INDIA_STATES,
  pricingLabel,
  formatDay,
  formatInr,
  formatUsd,
  todayInIndia,
  validateEmployee,
  type Errors,
} from '@/lib/eor/onboarding';
import { Badge, Notice, STATUS_TONE, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';
import { EmailLog } from './ClientDetail';
import { EmployeePortalPanel, type PortalData } from './EmployeePortalPanel';

type Detail = {
  employee: EorEmployee;
  company: { id: string; status: string; name: string } | null;
  scheduleText: string | null;
  voided: VoidedSignature[];
  messages: OutboxEntry[];
  viewer: { email: string | null; bootstrap: boolean };
} & PortalData;

const stamp = (value: string | null) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className="text-sm text-ink-primary">{value || '—'}</dd>
    </div>
  );
}

export function EmployeeDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<'edit' | 'exit' | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const load = useCallback(async () => {
    const response = await fetch(`/api/basecamp/employees/${id}`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setError(json.error || 'Unable to load.');
    setDetail(json);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(payload: Record<string, unknown>, label: string, success?: string): Promise<Record<string, unknown> | null> {
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(`/api/basecamp/employees/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (json.errors) setErrors(json.errors);
        if (payload.action === 'countersign' && /start date has passed/.test(json.error ?? '') && !payload.confirmPastStart) {
          if (window.confirm(`${json.error}\n\nCountersign with a backdated start? This is recorded in the audit log.`)) {
            setBusy(null);
            return act({ ...payload, confirmPastStart: true }, label, success);
          }
        }
        throw new Error(json.error || 'Unable to do that.');
      }
      if (success) setOk(success);
      await load();
      return json;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to do that.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (!detail) return error ? <Notice kind="error">{error}</Notice> : <p className="text-sm text-ink-secondary">Loading…</p>;
  const { employee: e, company } = detail;
  const named = !detail.viewer.bootstrap;
  const editable = ['draft', 'awaiting_signature', 'signed'].includes(e.status);
  const doneSteps = e.employeeCase ? employeeSteps(e).filter((s) => e.employeeCase?.steps[s.key]).length : 0;

  return (
    <div className="space-y-6">
      <div>
        {company && (
          <Link href={`/basecamp/clients/${company.id}`} className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {company.name}
          </Link>
        )}
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink-primary">{e.employeeName}</h1>
              <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              {e.jobTitle} · {e.workState} · starts {formatDay(e.startDate)}
              {e.scheduleNumber ? ` · Schedule A-${e.scheduleNumber}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {e.status === 'draft' && (
              <button type="button" disabled={busy !== null} onClick={() => void act({ action: 'send' }, 'send', 'Sent to the customer for signature.')} className={primaryButtonClass}>
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Send for signature
              </button>
            )}
            {e.status === 'signed' && (
              <button
                type="button"
                disabled={busy !== null || !named || company?.status !== 'active'}
                title={company?.status !== 'active' ? 'Countersign the client agreement first' : ''}
                onClick={() => window.confirm(`Countersign ${e.employeeName}'s schedule for Ensaar? This starts their onboarding.`) && void act({ action: 'countersign' }, 'countersign', 'Countersigned. Onboarding has started.')}
                className={cn(primaryButtonClass, 'bg-emerald-600')}
              >
                {busy === 'countersign' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />} Countersign
              </button>
            )}
            {e.status === 'onboarding' && (
              <button type="button" disabled={busy !== null} onClick={() => void act({ action: 'activate' }, 'activate', `${e.employeeName} is active.`)} className={buttonClass}>
                <UserCheck className="h-4 w-4" aria-hidden /> Mark active
              </button>
            )}
            {editable && (
              <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'edit' ? null : 'edit')} className={buttonClass}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit offer
              </button>
            )}
            {['onboarding', 'active'].includes(e.status) && (
              <button type="button" disabled={busy !== null || !named} onClick={() => setPanel(panel === 'exit' ? null : 'exit')} className={cn(buttonClass, 'text-red-700')}>
                <LogOut className="h-4 w-4" aria-hidden /> Record exit
              </button>
            )}
            {editable && (
              <button
                type="button"
                disabled={busy !== null || !named}
                onClick={() => window.confirm(`Cancel ${e.employeeName}'s hire?`) && void act({ action: 'cancel' }, 'cancel', 'Hire cancelled.')}
                className={cn(buttonClass, 'text-red-700')}
              >
                <XCircle className="h-4 w-4" aria-hidden /> Cancel hire
              </button>
            )}
          </div>
        </div>
      </div>

      {!named && <Notice kind="warn">You are using the shared login. Editing, countersigning and exits need your own account.</Notice>}
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      {ok && <Notice kind="ok" onClose={() => setOk(null)}>{ok}</Notice>}
      {e.status === 'signed' && company?.status !== 'active' && <Notice kind="warn">Countersign the client&apos;s master agreement first; then this schedule can be countersigned.</Notice>}

      {panel === 'edit' && (
        <EditOffer
          employee={e}
          errors={errors}
          setErrors={setErrors}
          busy={busy === 'edit'}
          onSubmit={async (patch) => {
            if (e.status === 'signed' && !window.confirm('The customer already signed. Changing the offer voids that signature (kept in history) and asks them to sign the updated schedule. Continue?')) return;
            if (await act({ action: 'update', employee: patch }, 'edit', 'Offer updated.')) setPanel(null);
          }}
        />
      )}
      {panel === 'exit' && (
        <ExitForm busy={busy === 'exit'} onSubmit={async (exitDate, reason) => (await act({ action: 'exit', exitDate, reason }, 'exit', 'Exit recorded.')) && setPanel(null)} />
      )}

      <EmployeePortalPanel
        employeeId={e.id}
        hasEmail={Boolean(e.employeeEmail)}
        canInvite={!['draft', 'cancelled'].includes(e.status)}
        named={named}
        data={detail}
        act={act}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Offer</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Row label="Email" value={e.employeeEmail} />
            <Row label="Charged as" value={pricingLabel(e.pricing)} />
            {e.pricing === 'loaded' ? (
              <Row label="Unit loaded cost" value={`${formatUsd(e.loadedCostUsd ?? 0)} a month, all-in`} />
            ) : (
              <Row label="EOR fee" value={`${formatUsd(e.monthlyFeeUsd ?? 0)} a month`} />
            )}
            <Row label={e.pricing === 'loaded' ? 'Annual gross salary (not shown to the customer)' : 'Annual gross salary'} value={formatInr(e.salaryInr)} />
            <Row label="Deposit" value={e.depositRequired ? 'One month, refundable' : 'Not required at signing'} />
            <Row label="Start date" value={<span className={cn(e.startDate < todayInIndia() && ['draft', 'awaiting_signature', 'signed', 'onboarding'].includes(e.status) && 'font-medium text-orange-700')}>{formatDay(e.startDate)}</span>} />
            <Row label="Added" value={`${stamp(e.createdAt)} by ${e.createdBy ?? '—'}`} />
            {e.signedAt && <Row label="Customer signed" value={`${e.signedName} <${e.signedEmail}>, ${stamp(e.signedAt)}${e.signedIp ? ` from ${e.signedIp}` : ''}`} />}
            {e.countersignedAt && <Row label="Countersigned" value={`${e.countersignedBy}, ${stamp(e.countersignedAt)}`} />}
            {e.exitDate && <Row label="Exit" value={`${formatDay(e.exitDate)}: ${e.exitReason}`} />}
          </dl>
          {e.notes && <p className="mt-4 rounded-lg bg-bg-secondary p-3 text-sm text-ink-secondary">{e.notes}</p>}
        </section>

        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-ink-primary">
              Onboarding {e.employeeCase ? `(${doneSteps} of ${employeeSteps(e).length})` : ''}
            </h2>
            {e.employeeCase && (
              <form className="flex items-end gap-2" onSubmit={(ev) => { ev.preventDefault(); void act({ action: 'owner', owner: new FormData(ev.currentTarget).get('owner') }, 'owner', 'Owner saved.'); }}>
                <label className="text-xs text-ink-secondary">
                  Owner
                  <input name="owner" defaultValue={e.employeeCase.owner ?? ''} className={cn(inputClass, 'mt-1 w-56')} />
                </label>
                <button type="submit" disabled={busy !== null} className={buttonClass}>
                  Save
                </button>
              </form>
            )}
          </div>
          {e.employeeCase ? (
            <ul className="mt-3 space-y-2">
              {employeeSteps(e).map((step) => {
                const done = e.employeeCase?.steps[step.key];
                return (
                  <li key={step.key}>
                    <label className="flex items-start gap-3 text-sm">
                      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={Boolean(done)} disabled={busy !== null || !['onboarding', 'active'].includes(e.status)} onChange={(ev) => void act({ action: 'step', step: step.key, done: ev.target.checked }, `step:${step.key}`)} />
                      <span>
                        <span className={done ? 'text-ink-primary' : 'text-ink-secondary'}>{step.label}</span>
                        {done && <span className="block text-xs text-ink-secondary">{done.doneBy}, {stamp(done.doneAt)}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-secondary">Opens when Ensaar countersigns the schedule.</p>
          )}
        </section>
      </div>

      {detail.scheduleText && (
        <section className="rounded-xl border border-line-subtle bg-bg-primary p-5">
          <h2 className="text-sm font-semibold text-ink-primary">Schedule A-{e.scheduleNumber} {e.signedAt ? '(as signed)' : '(as sent to the customer)'}</h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-bg-secondary p-4 font-sans text-sm leading-relaxed text-ink-primary">{detail.scheduleText}</pre>
          {e.scheduleHash && <p className="mt-2 break-all text-[11px] text-ink-secondary">Fingerprint (SHA-256): {e.scheduleHash}</p>}
        </section>
      )}

      {detail.voided.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Voided signatures (kept for the record)</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
            {detail.voided.map((v) => (
              <li key={v.id}>
                Signed by {v.signedName} {stamp(v.signedAt)}; voided {stamp(v.voidedAt)} by {v.voidedBy}: {v.voidReason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.messages.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink-primary">Recent schedule emails for this client</h2>
          <EmailLog messages={detail.messages} emailConfigured onRetried={() => void load()} onError={setError} />
        </section>
      )}
    </div>
  );
}

function EditOffer({ employee, errors, setErrors, busy, onSubmit }: { employee: EorEmployee; errors: Errors; setErrors: (e: Errors) => void; busy: boolean; onSubmit: (patch: Record<string, string>) => void }) {
  const [form, setForm] = useState({
    employeeName: employee.employeeName,
    employeeEmail: employee.employeeEmail ?? '',
    jobTitle: employee.jobTitle,
    salaryInr: String(employee.salaryInr),
    startDate: employee.startDate,
    workState: employee.workState,
    pricing: employee.pricing as string,
    monthlyFeeUsd: employee.monthlyFeeUsd === null ? '' : String(employee.monthlyFeeUsd),
    loadedCostUsd: employee.loadedCostUsd === null ? '' : String(employee.loadedCostUsd),
    depositRequired: employee.depositRequired ? 'yes' : '',
    notes: employee.notes ?? '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      noValidate
      className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        const check = validateEmployee(form);
        if (!check.ok) return setErrors(check.errors);
        onSubmit(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {([['employeeName', 'Full name'], ['employeeEmail', 'Email'], ['jobTitle', 'Job title'], ['salaryInr', 'Annual salary (INR)'], ['startDate', 'Start date']] as const).map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block text-ink-secondary">{label}</span>
            <input className={inputClass} type={k === 'startDate' ? 'date' : 'text'} value={form[k]} aria-invalid={Boolean(errors[k])} onChange={(ev) => set(k, ev.target.value)} />
            {errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Works from</span>
          <select className={inputClass} value={form.workState} onChange={(ev) => set('workState', ev.target.value)}>
            {INDIA_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <PricingFields form={form} errors={errors} set={set} />
        <label className="block text-sm sm:col-span-3">
          <span className="mb-1 block text-ink-secondary">Internal notes</span>
          <input className={inputClass} value={form.notes} onChange={(ev) => set('notes', ev.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
      </button>
    </form>
  );
}

function ExitForm({ busy, onSubmit }: { busy: boolean; onSubmit: (date: string, reason: string) => void }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  return (
    <form className="grid gap-3 rounded-xl border border-line-subtle bg-bg-primary p-4 sm:grid-cols-3 sm:items-end" onSubmit={(ev) => { ev.preventDefault(); onSubmit(date, reason); }}>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-secondary">Last working day</span>
        <input type="date" className={inputClass} value={date} onChange={(ev) => setDate(ev.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-secondary">Reason</span>
        <input className={inputClass} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Resigned, end of engagement…" required />
      </label>
      <button type="submit" disabled={busy || !date || reason.trim().length < 3} className={cn(buttonClass, 'text-red-700')}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Record exit
      </button>
    </form>
  );
}
