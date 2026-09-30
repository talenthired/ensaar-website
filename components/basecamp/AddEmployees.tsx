'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, UserPlus } from 'lucide-react';
import {
  CSV_TEMPLATE,
  INDIA_STATES,
  formatDay,
  formatInr,
  formatUsd,
  parseEmployeesCsv,
  todayInIndia,
  validateEmployee,
  type EmployeeInput,
  type Errors,
} from '@/lib/eor/onboarding';
import { cn } from '@/lib/utils';
import { Notice, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';

const EMPTY = { employeeName: '', employeeEmail: '', jobTitle: '', salaryInr: '', startDate: '', workState: '', monthlyFeeUsd: '', notes: '' };

/** Add one employee, or import many from a spreadsheet. */
export function AddEmployees({ companyId, defaultFeeUsd, onAdded }: { companyId: string; defaultFeeUsd: number; onAdded: (message: string) => void }) {
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
      {mode === 'one' && <OneEmployee companyId={companyId} defaultFeeUsd={defaultFeeUsd} onAdded={(m) => { setMode(null); onAdded(m); }} />}
      {mode === 'csv' && <CsvImport companyId={companyId} defaultFeeUsd={defaultFeeUsd} onAdded={(m) => { setMode(null); onAdded(m); }} />}
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

function OneEmployee({ companyId, defaultFeeUsd, onAdded }: { companyId: string; defaultFeeUsd: number; onAdded: (m: string) => void }) {
  const [form, setForm] = useState({ ...EMPTY, monthlyFeeUsd: String(defaultFeeUsd) });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(send: boolean) {
    setError(null);
    const check = validateEmployee(form, { defaultFeeUsd });
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
        {field('salaryInr', 'Annual gross salary (INR)', { inputMode: 'numeric', placeholder: '1800000' }, salary ? `${formatInr(salary)} a year` : 'Cost to company, before employer contributions.')}
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
        {field('monthlyFeeUsd', 'Fee (USD per month)', { inputMode: 'numeric' }, `This client's agreed fee is ${formatUsd(defaultFeeUsd)}.`)}
        <label className="block text-sm sm:col-span-2">
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

function CsvImport({ companyId, defaultFeeUsd, onAdded }: { companyId: string; defaultFeeUsd: number; onAdded: (m: string) => void }) {
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
    setRows(parsed.rows.map((raw) => ({ raw: raw as Record<string, string>, result: validateEmployee(raw, { defaultFeeUsd }) })));
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
        One row per employee. Columns: Name, Email, Job title, Annual salary INR, Start date (YYYY-MM-DD), Work state, and
        optionally Monthly fee USD (this client&apos;s agreed fee, {formatUsd(defaultFeeUsd)}, is used when blank). Nothing is added until every row is valid.
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
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-bg-secondary text-ink-secondary">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Salary</th>
                  <th className="px-2 py-2">Start</th>
                  <th className="px-2 py-2">State</th>
                  <th className="px-2 py-2">Fee</th>
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
                    <td className="px-2 py-1.5">{r.result.ok ? formatUsd(r.result.value.monthlyFeeUsd) : r.raw.monthlyFeeUsd ?? ''}</td>
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
