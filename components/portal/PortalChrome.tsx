'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, LogOut, MailCheck, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { inputClass, primaryButtonClass } from '@/components/eor/ui';

/** The portal's own bar, in place of the website's navigation. */
export function PortalBar({ company, email, onSignOut }: { company?: string; email?: string; onSignOut?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle border-t-[3px] border-t-accent-primary bg-bg-primary/95 backdrop-blur print:hidden">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/portal" className="flex min-w-0 items-center gap-3" aria-label="Client portal home">
          <Image src="/ensaar-logo.png" alt="Ensaar Global" width={938} height={259} priority className="h-7 w-auto shrink-0" />
          <span className="truncate border-l border-line-subtle pl-3 text-sm font-semibold text-ink-primary">{company ?? 'Client portal'}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {email && <span className="hidden text-xs text-ink-secondary md:inline">{email}</span>}
          <a href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary">
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="sr-only lg:not-sr-only">ensaar.com</span>
          </a>
          <ThemeToggle />
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/** Email in, one-time link out. The answer is the same whether or not the address has access. */
export function SignIn({ notice }: { notice?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'sent' | 'error'; text?: string }>({ kind: 'idle' });
  return (
    <div className="min-h-screen bg-bg-secondary">
      <PortalBar />
      <div className="container-page flex min-h-[calc(100vh-4.25rem)] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-line-subtle bg-bg-primary p-8">
          <span className="eyebrow">Ensaar client portal</span>
          <h1 className="mt-3 text-2xl font-semibold text-ink-primary">Sign in</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Your company&apos;s employees, their onboarding, and your agreement with Ensaar. We email you a one-time sign-in
            link; there is no password.
          </p>
          {notice && (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {notice}
            </p>
          )}
          {state.kind === 'sent' ? (
            <p role="status" className="mt-6 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.text}
            </p>
          ) : (
            <form
              className="mt-6 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setState({ kind: 'busy' });
                try {
                  const response = await fetch('/api/portal/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
                  const json = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(json.error || 'Please try again.');
                  setState({ kind: 'sent', text: json.message });
                } catch (cause) {
                  setState({ kind: 'error', text: cause instanceof Error ? cause.message : 'Please try again.' });
                }
              }}
            >
              <label htmlFor="portal-email" className="block text-sm font-medium text-ink-primary">
                Work email
              </label>
              <input id="portal-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              {state.kind === 'error' && <p className="text-sm text-red-600">{state.text}</p>}
              <button type="submit" disabled={state.kind === 'busy'} className={`${primaryButtonClass} w-full py-2.5`}>
                {state.kind === 'busy' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Email me a sign-in link
              </button>
            </form>
          )}
          <p className="mt-6 text-xs text-ink-secondary">
            Not a client yet? <Link href="/services/employer-of-record" className="underline">See how Ensaar employs in India</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The landing page for a sign-in link: exchange the token in the fragment for a session. */
export function PortalAuth() {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const token = window.location.hash.replace(/^#/, '');
    // Clear it at once so it is not left in history or on screen.
    window.history.replaceState(null, '', window.location.pathname);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return setFailed('That sign-in link is incomplete. Request a new one below.');
    (async () => {
      const response = await fetch('/api/portal/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
      if (response.ok) return window.location.replace('/portal');
      const json = await response.json().catch(() => ({}));
      setFailed(json.error || 'That sign-in link has expired. Request a new one below.');
    })();
  }, []);
  if (failed) return <SignIn notice={failed} />;
  return (
    <div className="min-h-screen bg-bg-secondary">
      <PortalBar />
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-ink-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing you in…
      </p>
    </div>
  );
}
