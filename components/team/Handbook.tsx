'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, Moon } from 'lucide-react';
import { formatDay, signatureMatches } from '@/lib/eor/onboarding';
import { Badge, buttonClass, inputClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

export type HandbookStatus = {
  current: { version: string; hash: string; publishedAt: string } | null;
  acknowledged: { version: string; at: string } | null;
  pending: boolean;
  nightWork: { consented: boolean; at: string } | null;
};

type Say = (kind: 'ok' | 'error', text: string) => void;
type Published = { version: string; text: string; hash: string; publishedAt: string };

const isHeading = (line: string, next: string | undefined) =>
  /^\d+\.\s+\S/.test(line) ||
  (/[A-Z]/.test(line) && line === line.toUpperCase()) ||
  (line.length <= 70 && !/[.:;,?!)]$/.test(line) && !line.startsWith('- ') && !line.includes(' | ') && Boolean(next?.trim()));

/** The frozen handbook text, laid out: headings, paragraphs, lists and tables, as the PDF reads it. */
function HandbookText({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    if (line.includes(' | ')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes(' | ')) rows.push(lines[i++]!.split(' | '));
      i--;
      out.push(
        <table key={i} className="mt-2 w-full text-left text-xs">
          <thead><tr className="border-b border-line-subtle">{rows[0]!.map((c, k) => <th key={k} className="py-1 pr-3 font-semibold">{c}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((r, k) => <tr key={k} className="border-b border-line-subtle">{r.map((c, m) => <td key={m} className="py-1 pr-3 align-top">{c}</td>)}</tr>)}</tbody>
        </table>,
      );
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('- ')) items.push(lines[i++]!.trim().slice(2));
      i--;
      out.push(<ul key={i} className="mt-1 list-disc pl-5">{items.map((t) => <li key={t}>{t}</li>)}</ul>);
    } else if (isHeading(line, lines[i + 1])) {
      out.push(<h3 key={i} className="mt-5 font-semibold text-ink-primary">{line}</h3>);
    } else {
      out.push(<p key={i} className="mt-1">{line}</p>);
    }
  }
  return (
    <article className="max-h-[36rem] overflow-y-auto rounded-lg border border-line-subtle bg-bg-secondary p-5 text-sm leading-relaxed text-ink-primary">
      <h2 className="text-lg font-semibold">{lines[0]}</h2>
      {out}
    </article>
  );
}

/** The Employee Handbook: read it, acknowledge it, and give or withdraw night-work consent. */
export function Handbook({ name, say, onChanged }: { name: string; say: Say; onChanged: () => Promise<void> }) {
  const [data, setData] = useState<{ handbook: Published | null; status: HandbookStatus } | null>(null);
  const [typed, setTyped] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/team/handbook', { cache: 'no-store' });
    if (!response.ok) return say('error', 'Unable to load the handbook. Reload to try again.');
    setData(await response.json());
  }, [say]);
  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/team/handbook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Reload the page to sign in again.' : json.error || 'Please try again.');
      say('ok', success);
      await load();
      await onChanged();
    } catch (cause) {
      setConsent(false);
      say('error', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-ink-secondary">Loading…</p>;
  const { handbook, status } = data;
  if (!handbook) {
    return <p className="rounded-xl border border-dashed border-line-subtle bg-bg-primary p-6 text-sm text-ink-secondary">The Ensaar Employee Handbook will appear here. We will email you when it is ready to read.</p>;
  }
  const night = status.nightWork?.consented ?? false;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line-subtle bg-bg-primary p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ink-secondary" aria-hidden />
            <span className="font-medium text-ink-primary">Employee Handbook, version {handbook.version}</span>
            {status.pending ? <Badge tone="attention">Please acknowledge</Badge> : <Badge tone="good">Acknowledged {formatDay(status.acknowledged!.at)}</Badge>}
          </span>
        </div>
        <div className="mt-4">
          <HandbookText text={handbook.text} />
        </div>
        {status.pending && (
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await post({ action: 'acknowledge', name: typed, consent, hash: handbook.hash }, 'Thank you. A copy of the handbook is on its way to your email.');
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-primary">Type your legal name, {name}, to acknowledge</span>
              <input className={cn(inputClass, 'font-serif text-lg italic')} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoComplete="off" />
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-primary">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I have received the Ensaar Employee Handbook and read it, I will follow it, and I understand it is a guide to Ensaar&apos;s policies, not a contract.</span>
            </label>
            <button type="submit" disabled={busy || !consent || !signatureMatches(typed, name)} className={primaryButtonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Acknowledge the handbook
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-line-subtle bg-bg-primary p-4">
        <h3 className="flex items-center gap-2 font-medium text-ink-primary">
          <Moon className="h-4 w-4 text-ink-secondary" aria-hidden /> Working after 8:30 pm
        </h3>
        <p className="mt-1 text-sm text-ink-secondary">
          If your hours with the client run after 8:30 pm India time, Ensaar needs your consent. You work from home, and you can withdraw consent at any time.
        </p>
        <p className="mt-2 text-sm text-ink-primary">
          {status.nightWork ? (night ? `You consented on ${formatDay(status.nightWork.at)}.` : `You withdrew consent on ${formatDay(status.nightWork.at)}.`) : 'You have not said yet.'}
        </p>
        <button
          type="button"
          disabled={busy}
          className={cn(night ? buttonClass : primaryButtonClass, 'mt-3 px-3 py-1.5')}
          onClick={() => post({ action: 'night_work', consented: !night }, night ? 'Consent withdrawn. HR will talk to you about your hours.' : 'Thank you. Your consent is recorded.')}
        >
          {night ? 'Withdraw consent' : 'I consent to work after 8:30 pm from home'}
        </button>
      </div>
    </div>
  );
}
