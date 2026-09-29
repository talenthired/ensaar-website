'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { REGISTRATION_STATUSES, type RegistrationStatus } from '@/lib/events/registration-types';

type Registration = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: RegistrationStatus;
  createdAt: string;
};

type EventOption = { id: string; title: string; date: string; capacity?: number | null };

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  registered: 'bg-emerald-50 text-emerald-700',
  waitlisted: 'bg-amber-50 text-amber-800',
  cancelled: 'bg-red-50 text-red-700',
  attended: 'bg-sky-50 text-sky-700',
};

export function RegistrationsAdmin() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (selected: string) => {
    setLoading(true);
    try {
      const query = selected ? `?eventId=${encodeURIComponent(selected)}` : '';
      const [eventsResponse, registrationsResponse] = await Promise.all([
        fetch('/api/basecamp/events', { cache: 'no-store' }),
        fetch(`/api/basecamp/registrations${query}`, { cache: 'no-store' }),
      ]);
      const eventsData = await eventsResponse.json();
      const registrationsData = await registrationsResponse.json();
      if (!registrationsResponse.ok) throw new Error(registrationsData.error || 'Unable to load registrations.');
      setEvents(eventsData.events ?? []);
      setRegistrations(registrationsData.registrations ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(eventId);
  }, [eventId, load]);

  const titles = useMemo(() => new Map(events.map((e) => [e.id, e.title])), [events]);

  async function setStatus(id: string, status: RegistrationStatus) {
    setBusy(id);
    try {
      const response = await fetch(`/api/basecamp/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to update.');
      await load(eventId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/basecamp/registrations/${id}`, { method: 'DELETE' });
      await load(eventId);
    } finally {
      setBusy(null);
    }
  }

  const counts = registrations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Registrations</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Everyone who signed up from the public events page.
          </p>
        </div>
        <a
          href={`/api/basecamp/registrations?format=csv${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ''}`}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-line-subtle px-3.5 py-2 text-sm text-ink-secondary hover:text-ink-primary"
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </a>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mr-2 text-ink-secondary">Event</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-sm text-ink-primary"
          >
            <option value="">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.date} · {event.title}
              </option>
            ))}
          </select>
        </label>
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className={`rounded px-2 py-1 text-xs ${STATUS_STYLE[status as RegistrationStatus] ?? ''}`}>
            {count} {status}
          </span>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-ink-secondary">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : registrations.length === 0 ? (
        <p className="rounded-lg border border-line-subtle bg-bg-primary px-4 py-8 text-center text-sm text-ink-secondary">
          No registrations yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {registrations.map((registration) => (
            <li
              key={registration.id}
              className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-bg-primary p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-primary">{registration.name}</p>
                <p className="truncate text-xs text-ink-secondary">
                  {registration.email}
                  {registration.company ? ` · ${registration.company}` : ''}
                  {registration.phone ? ` · ${registration.phone}` : ''}
                </p>
                {!eventId && (
                  <p className="truncate text-xs text-ink-secondary">
                    {titles.get(registration.eventId) ?? registration.eventId}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={registration.status}
                  disabled={busy === registration.id}
                  onChange={(e) => void setStatus(registration.id, e.target.value as RegistrationStatus)}
                  className="rounded-lg border border-line-subtle bg-bg-primary px-2.5 py-1.5 text-sm text-ink-primary disabled:opacity-60"
                >
                  {REGISTRATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${registration.name}`}
                  disabled={busy === registration.id}
                  onClick={() => void remove(registration.id)}
                  className="rounded-lg border border-line-subtle p-2 text-ink-secondary hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
