import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { decideHolidayPlan, holidayView } from '@/lib/eor/team';
import { requirePortal } from '@/lib/eor/portal-auth';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The company's holiday calendar for a year, as its employees proposed it. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const year = holidayYear(request.nextUrl.searchParams.get('year'));
  return NextResponse.json(await holidayView(gate.ctx.companyId, year));
}

/** The client approves the calendar, or asks for changes with a note. Only its own. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { year?: unknown; decision?: unknown; note?: unknown };
  if (body.decision !== 'approved' && body.decision !== 'rejected') return NextResponse.json({ error: 'Approve or ask for changes.' }, { status: 400 });
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  const year = holidayYear(String(body.year ?? ''));
  const decided = await decideHolidayPlan({
    companyId: gate.ctx.companyId,
    year,
    approve: body.decision === 'approved',
    note: note || null,
    by: `${gate.ctx.user.name ?? gate.ctx.user.email} <${gate.ctx.user.email}>`,
    role: 'client',
  });
  if (!decided.ok) return NextResponse.json({ error: decided.error }, { status: decided.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'portal.holidays.decide', target: gate.ctx.companyId, metadata: { year, decision: body.decision } });
  await deliverSoon();
  return NextResponse.json({ plan: decided.value });
}
