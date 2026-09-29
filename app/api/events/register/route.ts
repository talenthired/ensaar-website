import { NextRequest, NextResponse } from 'next/server';
import { registerForEvent } from '@/lib/events/registrations';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Public event registration, from the /events page.
 *
 * Unauthenticated by design, so it is throttled and every field is bounded before
 * it reaches the database. Ten per hour per client is generous for a person
 * signing up a colleague and useless for a script filling a guest list.
 */
export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientKey(request, 'event-register'), 10, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many registrations. Try again shortly.');

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

  const eventId = str(body.eventId, 60);
  const name = str(body.name, 120);
  const email = str(body.email, 254);
  if (!eventId) return NextResponse.json({ error: 'Pick an event.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    const result = await registerForEvent({
      eventId,
      name,
      email,
      company: str(body.company, 120),
      phone: str(body.phone, 40),
      notes: str(body.notes, 1000),
      source: 'events-page',
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, duplicate: result.duplicate }, { status: 201 });
  } catch (error) {
    console.error('Event registration failed', error);
    const message =
      error instanceof Error && /DATABASE_URL/.test(error.message)
        ? 'Registration is not available yet.'
        : 'Unable to register right now.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
