'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

type EventOption = { id: string; title: string; date: string };

/**
 * Public registration for an upcoming event.
 *
 * Collapsed to a single button until someone opts in, so the events page still
 * reads as a page about events rather than a form. Registering twice with the
 * same address updates the existing registration rather than creating a second
 * one, which the server enforces.
 */
export function EventRegisterForm({ events }: { events: EventOption[] }) {
  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (events.length === 0) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId, name, email, company }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to register right now.');
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register right now.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <p className="flex items-center gap-2 font-semibold">
          <Check className="h-5 w-5" aria-hidden />
          You are registered
        </p>
        <p className="mt-1 text-sm">We will email you the joining details before the session.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-6 py-3.5 text-sm font-semibold text-[#0c2343] transition hover:-translate-y-0.5 hover:bg-[#f7b83e]"
      >
        Register for an upcoming event
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line-subtle bg-bg-primary p-5">
      <h3 className="text-base font-semibold text-ink-primary">Register</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-ink-secondary">Event</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.date} · {event.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-secondary">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-secondary">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-ink-secondary">Company (optional)</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
            className="w-full rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-ink-primary"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-5 py-2.5 text-sm font-semibold text-[#0c2343] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Confirm registration
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line-subtle px-4 py-2.5 text-sm text-ink-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
