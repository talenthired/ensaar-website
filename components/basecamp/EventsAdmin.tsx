'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ExternalLink, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { EVENT_TYPES, isUpcoming, type EventRecord, type EventType } from '@/lib/events/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<EventType, string> = {
  webinar: 'Webinar',
  workshop: 'Workshop',
  meetup: 'Meetup',
  conference: 'Conference',
};

type Draft = {
  title: string;
  date: string;
  type: EventType;
  location: string;
  summary: string;
  href: string;
  speakers: string;
  published: boolean;
};

function toDraft(event?: EventRecord): Draft {
  return {
    title: event?.title ?? '',
    date: event?.date ?? '',
    type: event?.type ?? 'workshop',
    location: event?.location ?? '',
    summary: event?.summary ?? '',
    href: event?.href ?? '',
    speakers: event?.speakers?.join(', ') ?? '',
    published: event?.published ?? false,
  };
}

export function EventsAdmin() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editing, setEditing] = useState<EventRecord | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/basecamp/events', { cache: 'no-store' });
      if (response.status === 401) {
        router.push('/basecamp/login');
        return;
      }
      const result = (await response.json()) as { events?: EventRecord[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to load events.');
      setEvents(result.events || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(
    () => ({
      upcoming: events.filter((event) => isUpcoming(event)).sort((a, b) => a.date.localeCompare(b.date)),
      past: events.filter((event) => !isUpcoming(event)).sort((a, b) => b.date.localeCompare(a.date)),
    }),
    [events],
  );
  const liveCount = events.filter((event) => event.published && isUpcoming(event)).length;

  async function togglePublished(event: EventRecord) {
    setBusyId(event.id);
    setError('');
    try {
      const response = await fetch(`/api/basecamp/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !event.published }),
      });
      const result = (await response.json()) as { event?: EventRecord; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error || 'Unable to update.');
      setEvents((current) => current.map((item) => (item.id === event.id ? result.event! : item)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update.');
    } finally {
      setBusyId('');
    }
  }

  async function remove(event: EventRecord) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setBusyId(event.id);
    setError('');
    try {
      const response = await fetch(`/api/basecamp/events/${event.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || 'Unable to delete.');
      }
      setEvents((current) => current.filter((item) => item.id !== event.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete.');
    } finally {
      setBusyId('');
    }
  }

  async function save(draft: Draft) {
    const target = editing === 'new' ? null : editing;
    const response = await fetch(
      target ? `/api/basecamp/events/${target.id}` : '/api/basecamp/events',
      {
        method: target ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      },
    );
    const result = (await response.json()) as { event?: EventRecord; error?: string };
    if (!response.ok || !result.event) throw new Error(result.error || 'Unable to save the event.');

    setEvents((current) =>
      target
        ? current.map((item) => (item.id === target.id ? result.event! : item))
        : [result.event!, ...current],
    );
    setEditing(null);
  }

  return (
    <section>
      <div className="flex flex-col gap-5 border-b border-line-subtle pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Events</span>
          <h1 className="mt-4 text-3xl md:text-4xl">Events calendar</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            {liveCount} upcoming {liveCount === 1 ? 'event is' : 'events are'} live on ensaar.com.
            Drafts stay here until you publish them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Refresh events"
            aria-label="Refresh events"
            onClick={() => void load()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-subtle bg-bg-primary text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-primary px-4 py-2.5 text-sm font-semibold text-bg-primary transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New event
          </button>
        </div>
      </div>

      {error && <p className="mt-5 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-600">{error}</p>}

      {loading && !events.length ? (
        <p className="p-12 text-center text-sm text-ink-muted">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="mt-6 rounded-xl border border-line-subtle bg-bg-primary p-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-ink-muted" aria-hidden />
          <p className="mt-4 font-semibold text-ink-primary">No events yet</p>
          <p className="mt-1 text-sm text-ink-muted">Add one to show it on the public events page.</p>
        </div>
      ) : (
        <>
          <EventGroup
            heading="Upcoming"
            events={upcoming}
            busyId={busyId}
            onEdit={setEditing}
            onToggle={togglePublished}
            onDelete={remove}
          />
          <EventGroup
            heading="Past"
            events={past}
            busyId={busyId}
            onEdit={setEditing}
            onToggle={togglePublished}
            onDelete={remove}
          />
        </>
      )}

      {editing && (
        <EventEditor
          event={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </section>
  );
}

function EventGroup({
  heading,
  events,
  busyId,
  onEdit,
  onToggle,
  onDelete,
}: {
  heading: string;
  events: EventRecord[];
  busyId: string;
  onEdit: (event: EventRecord) => void;
  onToggle: (event: EventRecord) => void;
  onDelete: (event: EventRecord) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
        {heading} ({events.length})
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-line-subtle bg-bg-primary">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col gap-4 border-b border-line-subtle p-5 last:border-b-0 md:flex-row md:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent-secondary">
                  {TYPE_LABELS[event.type]}
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-semibold',
                    event.published
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                  )}
                >
                  {event.published ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="mt-2 truncate font-semibold text-ink-primary">{event.title}</p>
              <p className="mt-1 text-xs text-ink-muted">
                <time dateTime={event.date}>{formatDate(event.date)}</time> - {event.location}
                {event.speakers?.length ? ` - ${event.speakers.join(', ')}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={busyId === event.id}
                onClick={() => onToggle(event)}
                className="rounded-lg border border-line-subtle bg-bg-primary px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary disabled:opacity-50"
              >
                {event.published ? 'Unpublish' : 'Publish'}
              </button>
              {event.href && (
                <a
                  href={event.href}
                  target="_blank"
                  rel="noreferrer"
                  title="Open event link"
                  aria-label={`Open link for ${event.title}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-subtle text-ink-secondary transition hover:text-ink-primary"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              )}
              <IconAction label={`Edit ${event.title}`} onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" aria-hidden />
              </IconAction>
              <IconAction
                label={`Delete ${event.title}`}
                onClick={() => onDelete(event)}
                disabled={busyId === event.id}
                danger
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconAction>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventEditor({
  event,
  onClose,
  onSave,
}: {
  event?: EventRecord;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(event));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={event ? `Edit ${event.title}` : 'New event'}
    >
      <button type="button" aria-label="Close editor" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-line-subtle bg-bg-primary shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-subtle bg-bg-primary/95 px-6 py-4 backdrop-blur">
          <h2 className="text-xl">{event ? 'Edit event' : 'New event'}</h2>
          <IconAction label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>

        <div className="space-y-6 p-6">
          <Field label="Title">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="workspace-input"
              placeholder="BCEP Workshop: Leadership in the AI Era"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="workspace-input"
              />
            </Field>
            <Field label="Type">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as EventType })}
                className="workspace-input"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Location" hint='Use "Online", or "City, Region" for in-person events.'>
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              className="workspace-input"
              placeholder="Hyderabad, Telangana"
            />
          </Field>

          <Field label="Summary">
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={5}
              className="workspace-input resize-y"
              placeholder="What the session covers and who it is for."
            />
          </Field>

          <Field label="Speakers" hint="Comma separated. Optional.">
            <input
              value={draft.speakers}
              onChange={(e) => setDraft({ ...draft, speakers: e.target.value })}
              className="workspace-input"
              placeholder="BCEP Faculty, Invited practitioners"
            />
          </Field>

          <Field label="Registration link" hint="Optional. Must start with http:// or https://.">
            <input
              type="url"
              value={draft.href}
              onChange={(e) => setDraft({ ...draft, href: e.target.value })}
              className="workspace-input"
              placeholder="https://..."
            />
          </Field>

          <label className="flex items-start gap-3 rounded-xl border border-line-subtle bg-bg-secondary p-4">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-ink-primary">Publish to ensaar.com</span>
              <span className="mt-1 block text-xs text-ink-secondary">
                Published events appear on the public events page and in its structured data.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-ink-primary px-5 py-3.5 font-semibold text-bg-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving...' : event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-ink-primary">
      <span className="mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}

function IconAction({
  label,
  onClick,
  children,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-subtle bg-bg-primary transition disabled:opacity-50',
        danger
          ? 'text-ink-secondary hover:bg-rose-500/10 hover:text-rose-600'
          : 'text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary',
      )}
    >
      {children}
    </button>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
