'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, UserPlus } from 'lucide-react';
import {
  CSV_TEMPLATE,
  INDIA_STATES,
  PRICING_MODES,
  customerPrice,
  formatDay,
  formatInr,
  formatUsd,
  parseEmployeesCsv,
  parseLoadedCostUsd,
  pricingLabel,
  todayInIndia,
  validateEmployee,
  type EmployeeInput,
  type Errors,
  type Pricing,
} from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';
import { Notice, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';

const EMPTY = { employeeName: '', employeeEmail: '', jobTitle: '', salaryInr: '', startDate: '', workState: '', pricing: 'fee', monthlyFeeUsd: '', loadedCostUsd: '', notes: '' };

/** What each pricing option means for the customer, shown where the option is chosen. */
export const PRICING_HINTS: Record<Pricing, string> = {
  fee: 'The customer sees the salary and Ensaar’s fee separately, and pays the fee plus salary and statutory costs at cost.',
  loaded: 'The customer sees and pays one fixed monthly amount covering salary, statutory costs and Ensaar’s fee. The salary is not shown to them.',
};

/** Add one employee, or import many from a spreadsheet. */
export function AddEmployees({ companyId, onAdded }: { companyId: string; onAdded: (message: string) => void }) {
  const [mode, setMode] = useState<'one' | 'csv' | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode(mode === 'one' ? null : 'one')} className={mode === 'one' ? primaryButtonClass : buttonClass} aria-expanded={mode === 'one'}>
          <UserPlus className="h-4 w-4" aria-hidden /> Add employee
        </button>
        <button type="button" onClick={() => setMode(mode === 'csv' ? null : 'csv')} className={mode === 'csv' ? primaryButtonClass : buttonClass} aria-expanded={mode === 'csv'}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> Import CSV
        </button>
      </div>
      {mode === 'one' && <OneEmployee companyId={companyId} onAdded={(m) => { setMode(null); onAdded(m); }} />}
      {mode === 'csv' && <CsvImport companyId={companyId} onAdded={(m) => { setMode(null); onAdded(m); }} />}
    </div>
  );
}

async function post(companyId: string, employees: unknown[], send: boolean) {
  const response = await fetch(`/api/basecamp/clients/${companyId}/employees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employees, send }),
  });
  return { response, json: await response.json().catch(() => ({})) };
}

/** The pricing option and the one amount it needs. Shared by the add form and the edit form. */
export function PricingFields({ form, errors, set }: { form: { pricing: string; monthlyFeeUsd: string; loadedCostUsd: string }; errors: Errors; set: (key: 'pricing' | 'monthlyFeeUsd' | 'loadedCostUsd', value: string) => void }) {
  const loaded = form.pricing === 'loaded';
  const key = loaded ? 'loadedCostUsd' : 'monthlyFeeUsd';
  const cost = parseLoadedCostUsd(form.loadedCostUsd);
  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-secondary">How the customer is charged</span>
        <select id="emp-pricing" className={inputClass} value={form.pricing} aria-invalid={Boolean(errors.pricing)} onChange={(e) => set('pricing', e.target.value)}>
          {PRICING_MODES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.pricing && <span className="mt-1 block text-xs text-red-600">{errors.pricing}</span>}
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-secondary">{loaded ? 'Unit loaded cost (USD per month)' : 'EOR fee (USD per month)'}</span>
        <input id={`emp-${key}`} className={inputClass} inputMode="numeric" value={form[key]} aria-invalid={Boolean(errors[key])} onChange={(e) => set(key, e.target.value)} placeholder={loaded ? 'For example 3900' : 'For example 249'} />
        {errors[key] ? (
          <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>
        ) : (
          <span className="mt-1 block text-xs text-ink-secondary">{loaded ? (cost ? `${formatUsd(cost)} a month, ${formatUsd(cost * 12)} a year, all-in.` : 'Agreed with the client for this employee.') : 'Agreed with the client for this employee.'}</span>
        )}
      </label>
      <p className="text-xs text-ink-secondary sm:col-span-3">{PRICING_HINTS[loaded ? 'loaded' : 'fee']}</p>
    </>
  );
}

function OneEmployee({ companyId, onAdded }: { companyId: string; onAdded: (m: string) => void }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    // A field being corrected stops showing its old error.
    setErrors((current) => (current[k] ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== k)) : current));
  };

  async function submit(send: boolean) {
    setError(null);
    const check = validateEmployee(form);
    if (!check.ok) return setErrors(check.errors);
    setErrors({});
    setBusy(send ? 'send' : 'draft');
    try {
      const { response, json } = await post(companyId, [form], send);
      if (!response.ok) {
        setErrors(json.rowErrors?.[0]?.errors ?? {});
        throw new Error(json.error || 'Unable to add.');
      }
      onAdded(send ? `${form.employeeName} added and sent to the customer for signature.` : `${form.employeeName} added as a draft.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add.');
    } finally {
      setBusy(null);
    }
  }

  const salary = Number(form.salaryInr.replace(/[,\s]/g, ''));
  const field = (k: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-secondary">{label}</span>
      <input className={inputClass} value={form[k]} aria-invalid={Boolean(errors[k])} onChange={(e) => set(k, e.target.value)} {...props} />
      {errors[k] ? <span className="mt-1 block text-xs text-red-600">{errors[k]}</span> : hint ? <span className="mt-1 block text-xs text-ink-secondary">{hint}</span> : null}
    </label>
  );

  return (
    <form
      noValidate
      className="space-y-4 rounded-xl border border-line-subtle bg-bg-primary p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {field('employeeName', 'Full name')}
        {field('employeeEmail', 'Email', { type: 'email' }, 'Optional.')}
        {field('jobTitle', 'Job title')}
        {field(
          'salaryInr',
          'Annual gross salary (INR)',
          { inputMode: 'numeric', placeholder: '1800000' },
          salary ? `${formatInr(salary)} a year${form.pricing === 'loaded' ? '. For payroll only: not shown to the customer.' : ''}` : 'Cost to company, before employer contributions.',
        )}
        {field('startDate', 'Start date', { type: 'date', min: todayInIndia() })}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Works from</span>
          <select className={inputClass} value={form.workState} aria-invalid={Boolean(errors.workState)} onChange={(e) => set('workState', e.target.value)}>
            <option value="">Choose…</option>
            {INDIA_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {errors.workState && <span className="mt-1 block text-xs text-red-600">{errors.workState}</span>}
        </label>
        <PricingFields form={form} errors={errors} set={set} />
        <label className="block text-sm sm:col-span-3">
          <span className="mb-1 block text-ink-secondary">Internal notes</span>
          <input className={inputClass} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Not shown to the customer" />
        </label>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy !== null} className={primaryButtonClass}>
          {busy === 'send' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Add and send for signature
        </button>
        <button type="button" disabled={busy !== null} onClick={() => void submit(false)} className={buttonClass}>
          {busy === 'draft' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save as draft
        </button>
      </div>
    </form>
  );
}

type Checked = { raw: Record<string, string>; result: ReturnType<typeof validateEmployee> };

function CsvImport({ companyId, onAdded }: { companyId: string; onAdded: (m: string) => void }) {
  const [rows, setRows] = useState<Checked[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function read(file: File) {
    setError(null);
    setRows(null);
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) return setError('That file is larger than 2 MB. Split it into smaller files.');
    const parsed = parseEmployeesCsv(await file.text());
    if (parsed.error) return setError(parsed.error);
    if (parsed.rows.length > 500) return setError(`That file has ${parsed.rows.length} rows; import at most 500 at a time.`);
    setUnknown(parsed.unknownHeaders);
    setRows(parsed.rows.map((raw) => ({ raw: raw as Record<string, string>, result: validateEmployee(raw) })));
  }

  const invalid = rows?.filter((r) => !r.result.ok).length ?? 0;
  const valid = rows?.filter((r) => r.result.ok).map((r) => (r.result as { ok: true; value: EmployeeInput }).value) ?? [];

  async function submit(send: boolean) {
    if (!rows || invalid) return;
    setBusy(send ? 'send' : 'draft');
    setError(null);
    try {
      const { response, json } = await post(companyId, valid, send);
      if (!response.ok) throw new Error(json.error || 'Unable to import.');
      onAdded(`${json.added} employee${json.added === 1 ? '' : 's'} imported${send ? ' and sent to the customer for signature' : ' as drafts'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to import.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4">
      <p className="text-sm text-ink-secondary">
        One row per employee. Columns: Name, Email, Job title, Annual salary INR, Start date (YYYY-MM-DD), Work state, Pricing
        (&ldquo;Salary + EOR fee&rdquo; or &ldquo;Unit loaded cost&rdquo;), and then Monthly fee USD or Loaded cost USD to match. Each row
        carries its own amount; nothing is added until every row is valid.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" aria-label="Choose a CSV file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void read(f); }} />
        <button type="button" onClick={() => input.current?.click()} className={buttonClass}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> {fileName ? 'Choose another file' : 'Choose CSV file'}
        </button>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="ensaar-employees-template.csv" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary underline">
          <Download className="h-4 w-4" aria-hidden /> Download template
        </a>
        {fileName && <span className="text-xs text-ink-secondary">{fileName}</span>}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {unknown.length > 0 && <Notice kind="warn">Ignored columns: {unknown.join(', ')}.</Notice>}
      {rows && (
        <>
          <p className={cn('text-sm font-medium', invalid ? 'text-red-700' : 'text-emerald-700')}>
            {rows.length} row{rows.length === 1 ? '' : 's'}: {rows.length - invalid} ready{invalid ? `, ${invalid} need fixing in the spreadsheet` : ''}.
          </p>
          <div className="max-h-96 overflow-auto rounded-lg border border-line-subtle">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="sticky top-0 bg-bg-secondary text-ink-secondary">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Salary</th>
                  <th className="px-2 py-2">Start</th>
                  <th className="px-2 py-2">State</th>
                  <th className="px-2 py-2">Pricing</th>
                  <th className="px-2 py-2">Customer pays</th>
                  <th className="px-2 py-2">Problems</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {rows.map((r, i) => (
                  <tr key={i} className={r.result.ok ? '' : 'bg-red-50/60'}>
                    <td className="px-2 py-1.5 text-ink-secondary">{i + 1}</td>
                    <td className="px-2 py-1.5">{r.raw.employeeName}</td>
                    <td className="px-2 py-1.5">{r.raw.jobTitle}</td>
                    <td className="px-2 py-1.5">{r.result.ok ? formatInr(r.result.value.salaryInr) : r.raw.salaryInr}</td>
                    <td className="px-2 py-1.5">{r.result.ok ? formatDay(r.result.value.startDate) : r.raw.startDate}</td>
                    <td className="px-2 py-1.5">{r.result.ok ? r.result.value.workState : r.raw.workState}</td>
                    <td className="px-2 py-1.5">{r.result.ok ? pricingLabel(r.result.value.pricing) : r.raw.pricing ?? ''}</td>
                    <td className="px-2 py-1.5">{r.result.ok ? customerPrice(r.result.value) : r.raw.monthlyFeeUsd ?? r.raw.loadedCostUsd ?? ''}</td>
                    <td className="px-2 py-1.5 text-red-700">{r.result.ok ? '' : Object.values(r.result.errors).join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={invalid > 0 || busy !== null} onClick={() => void submit(true)} className={primaryButtonClass}>
              {busy === 'send' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Import {valid.length} and send for signature
            </button>
            <button type="button" disabled={invalid > 0 || busy !== null} onClick={() => void submit(false)} className={buttonClass}>
              {busy === 'draft' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Import as drafts
            </button>
          </div>
        </>
      )}
    </div>
  );
}
