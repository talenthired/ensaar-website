import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { decideLeave, lossOfPay, pendingLeave } from '@/lib/eor/leave-store';
import { todayInIndia } from '@/lib/eor/onboarding';
import { deliverSoon } from '@/lib/notify/outbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Leave across all clients: what is waiting, and unpaid days for a month's payroll (?month=YYYY-MM). */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const asked = request.nextUrl.searchParams.get('month') ?? '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : todayInIndia().slice(0, 7);
  const [pending, unpaid] = await Promise.all([pendingLeave(), lossOfPay(month)]);
  return NextResponse.json({ month, pending, unpaid, viewer: { bootstrap: gate.session.bootstrap } });
}

/** { id, approve, note }: Ensaar decides, in place of the client or over its decision. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; approve?: unknown; note?: unknown };
  if (typeof body.approve !== 'boolean') return NextResponse.json({ error: 'Approve or decline.' }, { status: 400 });
  const done = await decideLeave(String(body.id ?? ''), { approve: body.approve, note: body.note, by: actorName(gate.session), as: 'ensaar' });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.leave.decide', target: done.value.employeeId, metadata: { id: done.value.id, approve: body.approve } });
  await deliverSoon();
  return NextResponse.json({ request: done.value });
}
