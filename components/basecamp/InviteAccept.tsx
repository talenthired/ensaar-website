'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type State =
  | { kind: 'checking' }
  | { kind: 'invalid' }
  | { kind: 'ready'; email: string; role: string };

/**
 * Accept an invitation: confirm the link is still live, then set a password.
 *
 * The link is validated before the form is shown, so an expired or revoked
 * invitation says so immediately instead of after someone has chosen a password.
 */
export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/basecamp/invite/accept?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (cancelled) return;
        setState(response.ok && data.valid ? { kind: 'ready', email: data.email, role: data.role } : { kind: 'invalid' });
      } catch {
        if (!cancelled) setState({ kind: 'invalid' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/basecamp/invite/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to accept that invitation.');
      router.push('/basecamp');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to accept that invitation.');
      setBusy(false);
    }
  }

  if (state.kind === 'checking') {
    return (
      <p className="text-sm text-ink-secondary">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
        Checking your invitation…
      </p>
    );
  }

  if (state.kind === 'invalid') {
    return (
      <div className="rounded-xl border border-line-subtle bg-bg-primary p-6">
        <h1 className="text-lg font-semibold text-ink-primary">This invitation is no longer valid</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          It may have expired, been revoked, or already been used. Ask whoever invited you to send a
          new one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line-subtle bg-bg-primary p-6">
      <h1 className="text-lg font-semibold text-ink-primary">Set up your Basecamp account</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Invited as <strong className="text-ink-primary">{state.role}</strong> for {state.email}.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-secondary">Choose a password</span>
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          />
          <span className="mt-1 block text-xs text-ink-secondary">At least 10 characters.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2 text-sm font-medium text-bg-primary disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Create account
        </button>
      </form>
    </div>
  );
}
