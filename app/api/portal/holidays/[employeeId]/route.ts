import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { decideHolidayPlan } from '@/lib/eor/team';
import { requirePortal } from '@/lib/eor/portal-auth';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';

/** The client approves an employee's holidays, or asks for changes with a note. Only for its own employees. */
export async function POST(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { employeeId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { year?: unknown; decision?: unknown; note?: unknown };
  if (body.decision !== 'approved' && body.decision !== 'rejected') return NextResponse.json({ error: 'Approve or ask for changes.' }, { status: 400 });
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  const year = holidayYear(String(body.year ?? ''));
  const decided = await decideHolidayPlan({
    employeeId,
    year,
    approve: body.decision === 'approved',
    note: note || null,
    by: `${gate.ctx.user.name ?? gate.ctx.user.email} <${gate.ctx.user.email}>`,
    role: 'client',
    companyId: gate.ctx.companyId,
  });
  if (!decided.ok) return NextResponse.json({ error: decided.error }, { status: decided.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'portal.holidays.decide', target: employeeId, metadata: { year, decision: body.decision } });
  await deliverSoon();
  return NextResponse.json({ plan: decided.value });
}
