'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, Notice, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Row = { employeeId: string; name: string; companyName: string; status: string; acknowledgedVersion: string | null; acknowledgedAt: string | null; nightWork: boolean | null };
type Data = {
  version: string;
  changes: Array<{ version: string; summary: string }>;
  approval: { reviewer: string; recordedBy: string; recordedAt: string } | null;
  published: { version: string; issuedBy: string; publishedBy: string; publishedAt: string } | null;
  roster: Row[];
  viewer: { bootstrap: boolean; owner: boolean; signatory: boolean };
};

/**
 * The Employee Handbook: review this version as a PDF, record sign-off (an
 * owner), publish it (Ensaar's signatory), and see who has acknowledged it.
 */
export function HandbookAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/basecamp/policies', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Unable to load.' });
    setData(json);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (payload: Record<string, unknown>, label: string, success: (json: Record<string, unknown>) => string) => {
    setBusy(label);
    setMessage(null);
    const response = await fetch('/api/basecamp/policies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, version: data?.version }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) return setMessage({ kind: 'error', text: json.error || 'Please try again.' });
    setMessage({ kind: 'ok', text: success(json) });
    await load();
  };

  if (!data) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const current = data.published?.version === data.version;
  const acknowledged = data.roster.filter((r) => r.acknowledgedVersion === data.published?.version).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/basecamp/employees" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Employees
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Employee Handbook</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
          The policies the offer letter and employment agreement refer to: hours, leave, holidays, pay, conduct and corrective action. Each employee acknowledges
          the published version in the employee portal and gets a PDF copy; until they do, it is on their twice-weekly reminders.
        </p>
      </div>
      {message && <Notice kind={message.kind} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <section className="space-y-3 rounded-xl border border-line-subtle bg-bg-primary p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-ink-primary">Version {data.version}</h2>
          {current ? <Badge tone="good">Published {formatDay(data.published!.publishedAt)}</Badge> : data.approval ? <Badge tone="attention">Signed off, not published</Badge> : <Badge tone="attention">Needs sign-off</Badge>}
        </div>
        <p className="text-sm text-ink-secondary">{data.changes.find((c) => c.version === data.version)?.summary}</p>
        <a href="/api/basecamp/policies?format=pdf" target="_blank" rel="noopener" className={cn(buttonClass, 'px-3 py-1.5')}>
          <ExternalLink className="h-4 w-4" aria-hidden /> {current ? 'Published PDF' : 'Review the draft PDF'}
        </a>

        {data.approval ? (
          <p className="text-sm text-ink-secondary">
            Signed off: reviewed by {data.approval.reviewer}, recorded by {data.approval.recordedBy} on {formatDay(data.approval.recordedAt)}.
          </p>
        ) : data.viewer.owner && !data.viewer.bootstrap ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void act({ action: 'approve', reviewer }, 'approve', () => 'Sign-off recorded. Ensaar\'s signatory can now publish it.');
            }}
          >
            <label className="block flex-1 text-sm">
              <span className="mb-1 block font-medium text-ink-primary">Reviewed by</span>
              <input className={inputClass} value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="The lawyer or firm, or Self" />
            </label>
            <button type="submit" disabled={busy !== null} className={primaryButtonClass}>
              {busy === 'approve' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Record sign-off
            </button>
          </form>
        ) : (
          <p className="text-sm text-ink-secondary">An owner records sign-off for this version before it can be published.</p>
        )}

        {data.approval && !current && (
          data.viewer.signatory && !data.viewer.bootstrap ? (
            <button
              type="button"
              disabled={busy !== null}
              className={primaryButtonClass}
              onClick={() => act({ action: 'publish' }, 'publish', (json) => `Published. ${json.emailed} employee${json.emailed === 1 ? '' : 's'} emailed to read and acknowledge it.`)}
            >
              {busy === 'publish' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Publish to employees
            </button>
          ) : (
            <p className="text-sm text-ink-secondary">Ensaar&apos;s authorised signatory publishes it, in their name.</p>
          )
        )}
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-primary">
        <h2 className="border-b border-line-subtle p-4 text-sm font-semibold text-ink-primary">
          Acknowledgements{data.published ? `: ${acknowledged} of ${data.roster.length} on version ${data.published.version}` : ''}
        </h2>
        {data.roster.length === 0 ? (
          <p className="p-4 text-sm text-ink-secondary">No employees yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-secondary">
                <tr className="border-b border-line-subtle">
                  <th className="p-3 font-medium">Employee</th>
                  <th className="p-3 font-medium">Client</th>
                  <th className="p-3 font-medium">Handbook</th>
                  <th className="p-3 font-medium">After 8:30 pm</th>
                </tr>
              </thead>
              <tbody>
                {data.roster.map((r) => (
                  <tr key={r.employeeId} className="border-b border-line-subtle last:border-0">
                    <td className="p-3"><Link href={`/basecamp/employees/${r.employeeId}`} className="text-ink-primary hover:underline">{r.name}</Link></td>
                    <td className="p-3 text-ink-secondary">{r.companyName}</td>
                    <td className="p-3">
                      {r.acknowledgedVersion && r.acknowledgedVersion === data.published?.version ? (
                        <Badge tone="good">Acknowledged {formatDay(r.acknowledgedAt!)}</Badge>
                      ) : r.acknowledgedVersion ? (
                        <Badge tone="attention">Acknowledged {r.acknowledgedVersion} only</Badge>
                      ) : (
                        <Badge tone="attention">{data.published ? 'Not yet' : 'Not published'}</Badge>
                      )}
                    </td>
                    <td className="p-3 text-ink-secondary">{r.nightWork === null ? 'Not asked' : r.nightWork ? 'Consents' : 'Withdrawn'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
