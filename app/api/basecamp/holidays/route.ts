import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { HOLIDAY_COUNTRIES, holidayCatalogue, parseHolidayLines, type HolidayCountry } from '@/lib/eor/holidays';
import { CLIENT_COUNTRY, addHolidayCalendarEntries, listHolidayCalendar } from '@/lib/eor/team';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';

/** The holiday calendar for a year: what Ensaar has loaded, and the full list employees choose from. */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const year = holidayYear(request.nextUrl.searchParams.get('year'));
  const calendar = await listHolidayCalendar(year);
  return NextResponse.json({ year, calendar, catalogue: holidayCatalogue(year, CLIENT_COUNTRY, calendar), viewer: { bootstrap: gate.session.bootstrap } });
}

/** Load holidays, one "YYYY-MM-DD, Name" per line, for India or the client country. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const body = (await request.json().catch(() => ({}))) as { country?: unknown; lines?: unknown };
  const country = String(body.country ?? '') as HolidayCountry;
  if (!(country in HOLIDAY_COUNTRIES)) return NextResponse.json({ error: 'Choose a country.' }, { status: 400 });
  const parsed = parseHolidayLines(typeof body.lines === 'string' ? body.lines.slice(0, 20_000) : '');
  if (parsed.errors.length) return NextResponse.json({ error: parsed.errors.slice(0, 5).join(' ') }, { status: 400 });
  if (parsed.rows.length === 0) return NextResponse.json({ error: 'Add at least one holiday.' }, { status: 400 });
  const added = await addHolidayCalendarEntries(country, parsed.rows, actorName(gate.session));
  await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.holidays.add', metadata: { country, added } });
  return NextResponse.json({ added, skipped: parsed.rows.length - added });
}
