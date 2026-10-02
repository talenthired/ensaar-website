'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { LEAVE_TYPES, type LeaveType } from '@/lib/eor/leave';
import { formatDay } from '@/lib/eor/onboarding';
import { Notice, buttonClass, inputClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Pending = { id: string; employeeId: string; employeeName: string; companyName: string; type: LeaveType; from: string; to: string; days: number; reason: string | null; createdAt: string };
type Data = { month: string; pending: Pending[]; unpaid: Array<{ employeeId: string; employeeName: string; companyName: string; days: number }>; viewer: { bootstrap: boolean } };

/** Leave across all clients: requests still waiting for the client, and unpaid days for payroll. */
export function LeaveAdmin() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<{ id: string; note: string } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/basecamp/leave?month=${month}`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Unable to load.' });
    setData(json);
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, approve: boolean, note?: string) => {
    setBusy(id);
    setMessage(null);
    const response = await fetch('/api/basecamp/leave', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, approve, note }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Please try again.' });
    setDeclining(null);
    setMessage({ kind: 'ok', text: approve ? 'Approved for Ensaar. The employee has been emailed.' : 'Declined. The employee has been emailed with your note.' });
    await load();
  };

  const named = data ? !data.viewer.bootstrap : false;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/basecamp/employees" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Employees
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Leave</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
          Clients approve their employees&apos; leave in the client portal. Step in here when a request is stuck or needs Ensaar&apos;s decision. Balances and
          adjustments are on each employee&apos;s page.
        </p>
      </div>
      {message && <Notice kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <section className="rounded-xl border border-line-subtle bg-bg-primary">
        <h2 className="border-b border-line-subtle p-4 text-sm font-semibold text-ink-primary">Waiting for the client ({data?.pending.length ?? 0})</h2>
        {!data ? (
          <p className="p-4 text-sm text-ink-secondary">Loading…</p>
        ) : data.pending.length === 0 ? (
          <p className="p-4 text-sm text-ink-secondary">Nothing waiting.</p>
        ) : (
          <ul>
            {data.pending.map((r) => (
              <li key={r.id} className="border-b border-line-subtle p-4 last:border-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <Link href={`/basecamp/employees/${r.employeeId}`} className="font-medium text-ink-primary hover:underline">{r.employeeName}</Link>
                    <span className="text-ink-secondary"> · {r.companyName}</span>
                    <p className="text-ink-secondary">
                      {LEAVE_TYPES[r.type]}, {r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} to ${formatDay(r.to)}`} · {r.days} day{r.days === 1 ? '' : 's'} · asked {formatDay(r.createdAt)}
                    </p>
                    {r.reason && <p className="text-ink-secondary">“{r.reason}”</p>}
                  </div>
                  {named && (
                    <div className="flex gap-2">
                      <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => decide(r.id, true)}>
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Approve
                      </button>
                      <button type="button" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => setDeclining({ id: r.id, note: '' })}>
                        <X className="h-4 w-4" aria-hidden /> Decline
                      </button>
                    </div>
                  )}
                </div>
                {declining?.id === r.id && (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void decide(r.id, false, declining.note);
                    }}
                  >
                    <input className={inputClass} placeholder="Why (the employee sees this)" value={declining.note} onChange={(e) => setDeclining({ id: r.id, note: e.target.value })} required />
                    <button type="submit" disabled={busy !== null} className={cn(buttonClass, 'px-3 py-1.5')}>Decline</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-primary">
        <div className="flex flex-col gap-2 border-b border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-ink-primary">Unpaid days for payroll</h2>
          <input type="month" className={cn(inputClass, 'sm:w-48')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
        </div>
        {!data ? null : data.unpaid.length === 0 ? (
          <p className="p-4 text-sm text-ink-secondary">No unpaid leave in this month.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {data.unpaid.map((u) => (
                <tr key={u.employeeId} className="border-b border-line-subtle last:border-0">
                  <td className="p-3"><Link href={`/basecamp/employees/${u.employeeId}`} className="text-ink-primary hover:underline">{u.employeeName}</Link></td>
                  <td className="p-3 text-ink-secondary">{u.companyName}</td>
                  <td className="p-3 text-right font-medium text-ink-primary">{u.days} day{u.days === 1 ? '' : 's'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
