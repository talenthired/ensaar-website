'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole } from 'lucide-react';

export function BasecampLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/basecamp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      router.push('/basecamp');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-[82vh] px-5 pt-36 pb-20 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-line-subtle bg-bg-primary p-8 shadow-card">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
          <LockKeyhole className="h-6 w-6" aria-hidden />
        </div>
        <span className="eyebrow">Private</span>
        <h1 className="mt-5 text-3xl">Basecamp</h1>
        <p className="mt-3 text-sm text-ink-secondary">
          Website administration: contact submissions, the events calendar, and everything
          that keeps ensaar.com current.
        </p>

        <form onSubmit={submit} className="mt-8">
          <label htmlFor="basecamp-password" className="block text-sm font-semibold text-ink-primary mb-2">
            Basecamp password
          </label>
          <input
            id="basecamp-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-line-subtle bg-bg-secondary px-4 py-3.5 text-ink-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-primary px-5 py-3.5 font-semibold text-bg-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Open workspace'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <p role="alert" className="mt-4 min-h-5 text-sm text-rose-500">{error}</p>
        </form>
      </div>
    </section>
  );
}
