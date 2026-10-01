'use client';

import { useState } from 'react';
import { Check, Download, Loader2, Trash2 } from 'lucide-react';
import { MAX_DOCUMENT_BYTES, formatDay } from '@/lib/eor/onboarding';
import type { OutstandingList } from '@/lib/eor/outstanding';
import { UploadButton, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type Records = {
  bank: { holderName: string; accountNumber: string; ifsc: string; updatedAt: string } | null;
  files: Array<{ id: string; kind: 'bank_proof' | 'relieving_letter'; filename: string; sizeBytes: number; uploadedAt: string }>;
  noPreviousEmployer: boolean;
  outstanding: OutstandingList;
};

type Say = (kind: 'ok' | 'error', text: string) => void;

async function failure(response: Response, fallback: string) {
  if (response.status === 401) return 'Your session ended. Reload the page to sign in again.';
  return ((await response.json().catch(() => ({}))) as { error?: string }).error || fallback;
}

/**
 * What the employee gives Ensaar so they can be paid: the salary account and
 * proof of it, and a relieving letter from their last employer (or that this
 * is their first job). Each item disappears from the reminders once it is in.
 */
export function YourDetails({ records, legalName, say, onChanged }: { records: Records; legalName: string; say: Say; onChanged: (r: Records) => void }) {
  const [editingBank, setEditingBank] = useState(!records.bank);
  const [bank, setBank] = useState({ holderName: legalName, accountNumber: '', confirmAccountNumber: '', ifsc: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const files = (kind: Records['files'][number]['kind']) => records.files.filter((f) => f.kind === kind);

  async function call(label: string, input: RequestInfo, init: RequestInit, success: string) {
    setBusy(label);
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        const json = await response.clone().json().catch(() => ({}));
        if (json.errors) setErrors(json.errors);
        throw new Error(await failure(response, 'Unable to save.'));
      }
      onChanged(await response.json());
      say('ok', success);
      return true;
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Unable to save.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const upload = (kind: string, file: File) => {
    if (file.size > MAX_DOCUMENT_BYTES) return say('error', `${file.name} is larger than 10 MB.`);
    const body = new FormData();
    body.set('kind', kind);
    body.set('file', file);
    void call(`upload:${kind}`, '/api/team/files', { method: 'POST', body }, `${file.name} uploaded.`);
  };

  const fileList = (kind: Records['files'][number]['kind']) =>
    files(kind).length > 0 && (
      <ul className="mt-2 space-y-1 text-sm">
        {files(kind).map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /><span className="truncate">{f.filename}</span></span>
            <span className="flex shrink-0 items-center gap-3">
              <a href={`/api/team/files/${f.id}`} aria-label={`Download ${f.filename}`} className="text-ink-secondary hover:text-ink-primary"><Download className="h-4 w-4" aria-hidden /></a>
              <button type="button" aria-label={`Remove ${f.filename}`} disabled={busy !== null} onClick={() => void call(`remove:${f.id}`, `/api/team/files/${f.id}`, { method: 'DELETE' }, `${f.filename} removed.`)} className="text-ink-secondary hover:text-red-600">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
    );

  const needed = records.outstanding.needed;
  return (
    <div className="space-y-6">
      {needed.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="font-medium text-ink-primary">Still needed to pay your salary on time</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-primary">{needed.map((n) => <li key={n.key}>{n.detail}</li>)}</ul>
          <p className="mt-2 text-ink-secondary">We remind you every Monday and Thursday until these are in.</p>
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <Check className="h-4 w-4" aria-hidden /> Ensaar has everything it needs from you. Thank you.
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-5">
        <h2 className="text-sm font-semibold text-ink-primary">Bank account for salary</h2>
        {records.bank && !editingBank ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {records.bank.holderName} · {records.bank.accountNumber} · {records.bank.ifsc}
              <span className="block text-xs text-ink-secondary">Saved {formatDay(records.bank.updatedAt)}</span>
            </span>
            <button type="button" className={buttonClass} onClick={() => setEditingBank(true)}>Change account</button>
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrors({});
              if (await call('bank', '/api/team/bank', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bank) }, 'Bank account saved.')) setEditingBank(false);
            }}
          >
            {(
              [
                ['holderName', 'Name on the account', `Your legal name, ${legalName}, as the bank has it.`],
                ['ifsc', 'IFSC', '11 characters, on your cheque book or passbook.'],
                ['accountNumber', 'Account number', ''],
                ['confirmAccountNumber', 'Account number again', ''],
              ] as const
            ).map(([k, label, hint]) => (
              <label key={k} className="block text-sm">
                <span className="mb-1 block text-ink-secondary">{label}</span>
                <input
                  id={`bank-${k}`}
                  className={inputClass}
                  inputMode={k.toLowerCase().includes('account') ? 'numeric' : undefined}
                  autoComplete="off"
                  value={bank[k]}
                  aria-invalid={Boolean(errors[k])}
                  onChange={(e) => setBank((b) => ({ ...b, [k]: e.target.value }))}
                />
                {errors[k] ? <span className="mt-1 block text-xs text-red-600">{errors[k]}</span> : hint ? <span className="mt-1 block text-xs text-ink-secondary">{hint}</span> : null}
              </label>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busy !== null} className={primaryButtonClass}>{busy === 'bank' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save bank account</button>
              {records.bank && <button type="button" className={buttonClass} onClick={() => setEditingBank(false)}>Cancel</button>}
            </div>
          </form>
        )}
        <div className="border-t border-line-subtle pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-ink-primary">
              Proof of the account
              <span className="block text-xs text-ink-secondary">A cancelled cheque or the first page of your passbook. PDF, PNG or JPEG, up to 10 MB.</span>
            </span>
            <UploadButton label="Proof of bank account" busy={busy === 'upload:bank_proof'} disabled={busy !== null} onFile={(f) => upload('bank_proof', f)} />
          </div>
          {fileList('bank_proof')}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-5">
        <h2 className="text-sm font-semibold text-ink-primary">Relieving letter</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-secondary">From your last employer, if you had one.</span>
          {!records.noPreviousEmployer && <UploadButton label="Relieving letter" busy={busy === 'upload:relieving_letter'} disabled={busy !== null} onFile={(f) => upload('relieving_letter', f)} />}
        </div>
        {fileList('relieving_letter')}
        {files('relieving_letter').length === 0 && (
          <label className={cn('flex items-center gap-2 text-sm text-ink-primary', busy === 'none' && 'opacity-60')}>
            <input
              id="no-previous-employer"
              type="checkbox"
              checked={records.noPreviousEmployer}
              disabled={busy !== null}
              onChange={(e) =>
                void call('none', '/api/team/previous-employer', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ none: e.target.checked }) }, e.target.checked ? 'Noted: this is your first job.' : 'Noted.')
              }
            />
            This is my first job: I have no previous employer
          </label>
        )}
      </section>
    </div>
  );
}
