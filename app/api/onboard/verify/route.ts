import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon, emailConfigured } from '@/lib/notify/outbox';
import { portalGate, portalView } from '@/lib/eor/portal';
import { checkVerification, startVerification } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * Verify that the named signatory controls their email address (GAP-03), so a
 * forwarded link cannot sign as someone else. { action: 'send' } emails a code;
 * { action: 'check', code } confirms it.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; code?: unknown };
  const sending = body.action === 'send';
  // Sending costs an email, so it is throttled harder than checking.
  const gate = await portalGate(request, sending ? 'verify-send' : 'verify-check', sending ? 5 : 20);
  if (!gate.ok) return gate.response;

  if (sending) {
    if (!emailConfigured()) {
      return NextResponse.json(
        {
          error:
            'We cannot email a code right now. Ensaar will verify the signatory with you directly, and you will be able to sign once that is done.',
        },
        { status: 503 },
      );
    }
    const started = await startVerification(gate.client.id);
    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    await deliverSoon();
    await writeAudit({ actorEmail: gate.client.contactEmail, action: 'eor.verify.send', target: gate.client.id });
    return NextResponse.json({ sentTo: started.value.sentTo });
  }

  if (body.action === 'check' && typeof body.code === 'string') {
    const checked = await checkVerification(gate.client.id, body.code);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
    await writeAudit({ actorEmail: checked.value.company?.signatoryEmail, action: 'eor.verify.ok', target: gate.client.id });
    return NextResponse.json(await portalView(checked.value));
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
