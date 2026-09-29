import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon, retryMessage } from '@/lib/notify/outbox';

export const runtime = 'nodejs';

/** Put a failed or skipped email back in the queue and try it now. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!(await retryMessage(id))) {
    return NextResponse.json({ error: 'That email is not waiting for a retry.' }, { status: 409 });
  }
  await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'outbox.retry', target: id });
  await deliverSoon();
  return NextResponse.json({ ok: true });
}
