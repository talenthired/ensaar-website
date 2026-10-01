import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { holidayView, saveHolidayPlan } from '@/lib/eor/team';
import { requireTeam } from '@/lib/eor/team-auth';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';

/** Propose or change the client's holiday calendar for a year, as a draft or submitted to the client. */
export async function PUT(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { year?: unknown; chosen?: unknown; submit?: unknown };
  const year = holidayYear(String(body.year ?? ''));
  const submit = body.submit === true;
  const saved = await saveHolidayPlan(gate.employee, year, body.chosen, submit);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  await writeAudit({
    actorEmail: gate.employee.employeeEmail,
    action: submit ? 'team.holidays.submit' : 'team.holidays.save',
    target: gate.employee.id,
    metadata: { year, count: saved.value.chosen.length },
  });
  if (submit) await deliverSoon();
  return NextResponse.json(await holidayView(gate.employee.companyId, year));
}
