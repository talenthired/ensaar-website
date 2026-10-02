import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { cancelLeave, leaveSummary, requestLeave } from '@/lib/eor/leave-store';
import { todayInIndia } from '@/lib/eor/onboarding';
import { requireTeam } from '@/lib/eor/team-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yearOf = (value: string | null) => {
  const y = Number(value);
  return Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : Number(todayInIndia().slice(0, 4));
};

/** The employee's own leave for a year: balance, requests, adjustments. */
export async function GET(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const summary = await leaveSummary(gate.employee, yearOf(request.nextUrl.searchParams.get('year')));
  // Ensaar decides as Ensaar: staff names and emails stay in Basecamp.
  return NextResponse.json({
    ...summary,
    requests: summary.requests.map((r) => ({ ...r, decidedBy: r.decidedAs === 'ensaar' ? 'Ensaar' : r.decidedBy })),
    adjustments: summary.adjustments.map((a) => ({ ...a, createdBy: 'Ensaar' })),
  });
}

/** { action: 'request', type, from, to, halfStart, halfEnd, reason } or { action: 'cancel', id }. */
export async function POST(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-leave:${gate.employee.id}`), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action === 'cancel') {
    const done = await cancelLeave(gate.employee, String(body.id ?? ''));
    if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
    await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.leave.cancel', target: gate.employee.id, metadata: { id: done.value.id } });
    return NextResponse.json({ request: done.value });
  }
  if (body.action !== 'request') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  const done = await requestLeave(gate.employee, { type: body.type, from: body.from, to: body.to, halfStart: body.halfStart, halfEnd: body.halfEnd, reason: body.reason });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.leave.request', target: gate.employee.id, metadata: { id: done.value.id, type: done.value.type, days: done.value.days } });
  await deliverSoon();
  return NextResponse.json({ request: done.value });
}
