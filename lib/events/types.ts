export const EVENT_TYPES = ['webinar', 'workshop', 'meetup', 'conference'] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type EventRecord = {
  id: string;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  title: string;
  type: EventType;
  /** "Online", or "City, Region" for in-person events. Drives the Event JSON-LD. */
  location: string;
  summary: string;
  href?: string;
  speakers?: string[];
  /** Drafts stay in Basecamp; only published events reach the public site. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewEvent = Pick<EventRecord, 'title' | 'date' | 'type' | 'location' | 'summary'> &
  Partial<Pick<EventRecord, 'href' | 'speakers' | 'published'>>;

export type EventUpdate = Partial<
  Pick<
    EventRecord,
    'title' | 'date' | 'type' | 'location' | 'summary' | 'href' | 'speakers' | 'published'
  >
>;

/**
 * Upcoming vs past is derived from the date on every read, never stored. The previous
 * static event list carried a hand-set `status` field that silently went stale, leaving
 * events labelled "upcoming" months after they happened.
 */
export function isUpcoming(event: Pick<EventRecord, 'date'>, today = todayIso()) {
  return event.date >= today;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
