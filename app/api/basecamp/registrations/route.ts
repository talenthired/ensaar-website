import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { listRegistrations, registrationsToCsv } from '@/lib/events/registrations';

export const runtime = 'nodejs';

/** Registrations, optionally for one event, optionally as CSV. */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'registrations:read');
  if (!gate.ok) return gate.response;

  const eventId = request.nextUrl.searchParams.get('eventId') ?? undefined;
  const format = request.nextUrl.searchParams.get('format');
  try {
    const registrations = await listRegistrations(eventId);
    if (format === 'csv') {
      const suffix = eventId ? '-' + eventId : '';
      return new NextResponse(registrationsToCsv(registrations), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="registrations' + suffix + '.csv"',
          'cache-control': 'no-store',
        },
      });
    }
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('Registration list failed', error);
    return NextResponse.json({ error: 'Unable to load registrations.' }, { status: 500 });
  }
}
