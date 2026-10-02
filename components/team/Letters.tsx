'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { formatDay } from '@/lib/eor/onboarding';
import { Badge, buttonClass, primaryButtonClass } from '@/components/eor/ui';
import { cn } from '@/lib/utils';

type Say = (kind: 'ok' | 'error', text: string) => void;
type Letter = { id: string; title: string; text: string; issuedAt: string; responseDue: string | null; acknowledgedAt: string | null; replyText: string | null; repliedAt: string | null };

/** Letters from Ensaar HR: read, acknowledge, and reply (once) with your side. */
export function Letters({ say, onChanged }: { say: Say; onChanged: () => Promise<void> }) {
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/team/letters', { cache: 'no-store' });
    if (!response.ok) return say('error', 'Unable to load your letters. Reload to try again.');
    const json = await response.json();
    setLetters(json.letters);
    setOpen((current) => current ?? json.letters.find((l: Letter) => !l.acknowledgedAt)?.id ?? null);
  }, [say]);
  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: string, text: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/team/letters', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, reply: text }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session ended. Reload the page to sign in again.' : json.error || 'Please try again.');
      setLetters(json.letters);
      setReply('');
      say('ok', text ? 'Your reply has been sent to Ensaar HR and kept with the letter.' : 'Acknowledged.');
      await onChanged();
    } catch (cause) {
      say('error', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!letters) return <p className="text-sm text-ink-secondary">Loading…</p>;
  if (letters.length === 0) return <p className="rounded-xl border border-dashed border-line-subtle bg-bg-primary p-6 text-sm text-ink-secondary">No letters from Ensaar HR.</p>;
  return (
    <ul className="space-y-3">
      {letters.map((l) => (
        <li key={l.id} className="rounded-xl border border-line-subtle bg-bg-primary">
          <button type="button" className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen(open === l.id ? null : l.id)}>
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-ink-secondary" aria-hidden />
              <span className="font-medium text-ink-primary">{l.title}</span>
              <span className="text-sm text-ink-secondary">{formatDay(l.issuedAt)}</span>
            </span>
            {l.repliedAt ? <Badge tone="good">You replied {formatDay(l.repliedAt)}</Badge> : l.acknowledgedAt ? <Badge tone="good">Acknowledged</Badge> : <Badge tone="attention">Please read</Badge>}
          </button>
          {open === l.id && (
            <div className="space-y-3 border-t border-line-subtle p-4">
              <article className="whitespace-pre-line rounded-lg border border-line-subtle bg-bg-secondary p-4 text-sm leading-relaxed text-ink-primary">{l.text}</article>
              {l.replyText ? (
                <div className="text-sm">
                  <p className="font-medium text-ink-primary">Your reply</p>
                  <p className="mt-1 whitespace-pre-line text-ink-secondary">{l.replyText}</p>
                </div>
              ) : (
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void respond(l.id, reply);
                  }}
                >
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-ink-primary">
                      Your reply {l.responseDue ? `(please reply by ${formatDay(l.responseDue)})` : '(optional)'}
                    </span>
                    <textarea className="min-h-32 w-full rounded-lg border border-line-subtle bg-bg-primary p-3 text-sm text-ink-primary" value={reply} maxLength={8000} onChange={(e) => setReply(e.target.value)} />
                  </label>
                  <p className="text-xs text-ink-secondary">You can reply once here; it goes to Ensaar HR and is kept with this letter. To add more later, write to HR.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={busy || reply.trim().length < 5} className={primaryButtonClass}>
                      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send reply
                    </button>
                    {!l.acknowledgedAt && (
                      <button type="button" disabled={busy} className={cn(buttonClass, 'px-3 py-1.5')} onClick={() => respond(l.id, '')}>
                        I have read this
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
