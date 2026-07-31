import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';
import { createEvent, listEvents } from '@/lib/events/store';
import { parseEventInput } from '@/lib/events/validate';

export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  return verifyBasecampToken(request.cookies.get(BASECAMP_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ events: await listEvents() });
  } catch (error) {
    console.error('Event list failed', error);
    return NextResponse.json({ error: 'Unable to load events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = parseEventInput((await request.json()) as Record<string, unknown>);
    if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 });

    const event = await createEvent(parsed);
    // The public page is cached; without this a published event stays invisible.
    revalidatePath('/events');
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Event create failed', error);
    return NextResponse.json({ error: 'Unable to create the event.' }, { status: 500 });
  }
}
