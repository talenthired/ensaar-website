import { EVENT_TYPES, type EventType, type NewEvent } from './types';

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Speakers arrive as a comma-separated string from the form and as an array from the API. */
export function parseSpeakers(value: unknown): string[] | undefined {
  const list = Array.isArray(value)
    ? value.map((item) => clean(item, 120))
    : clean(value, 600)
        .split(',')
        .map((item) => item.trim());
  const speakers = list.filter(Boolean).slice(0, 12);
  return speakers.length > 0 ? speakers : undefined;
}

/**
 * Validates an event payload from the admin form. Returns the parsed event, or a
 * message naming the first field that failed so the panel can show it directly.
 */
export function parseEventInput(body: Record<string, unknown>): NewEvent | string {
  const title = clean(body.title, 200);
  const date = clean(body.date, 10);
  const type = clean(body.type, 20) as EventType;
  const location = clean(body.location, 160);
  const summary = clean(body.summary, 2000);
  const href = clean(body.href, 500);

  if (!title) return 'A title is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return 'A valid date (YYYY-MM-DD) is required.';
  }
  if (!EVENT_TYPES.includes(type)) return `Type must be one of: ${EVENT_TYPES.join(', ')}.`;
  if (!location) return 'A location is required. Use "Online" or "City, Region".';
  if (!summary) return 'A summary is required.';
  if (href && !/^https?:\/\//.test(href)) return 'The link must start with http:// or https://.';

  const speakers = parseSpeakers(body.speakers);
  return {
    title,
    date,
    type,
    location,
    summary,
    ...(href ? { href } : {}),
    ...(speakers ? { speakers } : {}),
    published: body.published === true,
  };
}
