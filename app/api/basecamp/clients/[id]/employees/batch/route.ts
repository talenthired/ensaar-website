import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { deliverSoon } from '@/lib/notify/outbox';
import { MAX_BATCH, changeEmployee, countersignSchedules, getEmployee, sendForSignature } from '@/lib/eor/employees';

export const runtime = 'nodejs';

/**
 * Act on many employees of one company at once:
 *   send         drafts to the customer for signature (one email for the batch)
 *   countersign  customer-signed schedules (starts each onboarding)
 *   cancel       hires that have not started
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; ids?: unknown; confirmPastStart?: unknown };
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((x): x is string => typeof x === 'string'))] : [];
  if (ids.length === 0) return NextResponse.json({ error: 'Choose at least one employee.' }, { status: 400 });
  if (ids.length > MAX_BATCH) return NextResponse.json({ error: `Choose at most ${MAX_BATCH}.` }, { status: 400 });
  const actor = actorName(gate.session);

  if (body.action === 'send') {
    const result = await sendForSignature(id, ids);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.schedules.send', target: id, metadata: { count: ids.length } });
    await deliverSoon();
    return NextResponse.json({ done: result.value.length });
  }

  if (body.action === 'countersign') {
    const refused = requireNamed(gate.session);
    if (refused) return refused;
    const confirmPastStart = body.confirmPastStart === true;
    const result = await countersignSchedules(id, ids, actor, { confirmPastStart });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.schedules.countersign',
      target: id,
      metadata: { count: ids.length, employees: ids, confirmPastStart },
    });
    await deliverSoon();
    return NextResponse.json({ done: result.value.length });
  }

  if (body.action === 'cancel') {
    let done = 0;
    const failed: string[] = [];
    for (const employeeId of ids) {
      // Scope first: an id from another client must never be acted on here.
      if (!(await getEmployee(employeeId, id))) {
        failed.push('No such employee.');
        continue;
      }
      const result = await changeEmployee(employeeId, { kind: 'cancel' }, actor);
      if (result.ok) done++;
      else failed.push(result.error);
    }
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.employees.cancel', target: id, metadata: { count: done } });
    return NextResponse.json({ done, failed }, { status: failed.length && !done ? 409 : 200 });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
