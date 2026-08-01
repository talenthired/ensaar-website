import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';
import { deleteEvent, updateEvent } from '@/lib/events/store';
import { parseEventInput } from '@/lib/events/validate';

export const runtime = 'nodejs';

async function authorized(request: NextRequest) {
  return verifyBasecampToken(request.cookies.get(BASECAMP_COOKIE)?.value);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    // A publish toggle sends only `published`; the full editor sends every field. Validate
    // the whole event only when the body actually carries one.
    if (Object.keys(body).length === 1 && typeof body.published === 'boolean') {
      const event = await updateEvent(id, { published: body.published });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      revalidatePath('/events');
      return NextResponse.json({ event });
    }

    const parsed = parseEventInput(body);
    if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 });

    const event = await updateEvent(id, parsed);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    revalidatePath('/events');
    return NextResponse.json({ event });
  } catch (error) {
    console.error('Event update failed', error);
    return NextResponse.json({ error: 'Unable to update the event.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    if (!(await deleteEvent(id))) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    revalidatePath('/events');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Event delete failed', error);
    return NextResponse.json({ error: 'Unable to delete the event.' }, { status: 500 });
  }
}
