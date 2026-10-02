import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { companyLeave, decideLeave } from '@/lib/eor/leave-store';
import { requirePortal } from '@/lib/eor/portal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The client's employees' leave: waiting for a decision, and coming up. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const rows = await companyLeave(gate.ctx.companyId);
  // The employee's reason is for whoever decides; the client sees it only while deciding.
  return NextResponse.json({ leave: rows.map((r) => ({ ...r, reason: r.status === 'pending' ? r.reason : null, decidedBy: r.decidedAs === 'ensaar' ? 'Ensaar' : r.decidedBy })) });
}

/** { id, approve, note }: approve or decline a request for one of the client's own employees. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; approve?: unknown; note?: unknown };
  if (typeof body.approve !== 'boolean') return NextResponse.json({ error: 'Approve or decline.' }, { status: 400 });
  const done = await decideLeave(String(body.id ?? ''), {
    approve: body.approve,
    note: body.note,
    by: gate.ctx.user.name ?? gate.ctx.user.email,
    as: 'client',
    companyId: gate.ctx.companyId,
  });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'portal.leave.decide', target: gate.ctx.companyId, metadata: { id: done.value.id, approve: body.approve } });
  await deliverSoon();
  return NextResponse.json({ request: done.value });
}
