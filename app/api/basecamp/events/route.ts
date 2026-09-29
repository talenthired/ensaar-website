import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { createEvent, listEvents } from '@/lib/events/store';
import { parseEventInput } from '@/lib/events/validate';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'events:read');
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ events: await listEvents() });
  } catch (error) {
    console.error('Event list failed', error);
    return NextResponse.json({ error: 'Unable to load events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'events:write');
  if (!gate.ok) return gate.response;
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
