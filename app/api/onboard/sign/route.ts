import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { signatureMatches } from '@/lib/eor/onboarding';
import { portalGate, portalView, signerNetwork } from '@/lib/eor/portal';
import { signAgreement } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * Sign the agreement. The request-level checks are here; everything that
 * depends on the record's state is re-checked by signAgreement under the client
 * lock (documents, verification, legal sign-off, the shown text).
 */
export async function POST(request: NextRequest) {
  const gate = await portalGate(request, 'sign', 10);
  if (!gate.ok) return gate.response;
  const { client } = gate;
  if (!client.company) {
    return NextResponse.json({ error: 'Complete your company details first.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; consent?: unknown; agreementHash?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  if (body.consent !== true) {
    return NextResponse.json({ error: 'Tick the box to agree to sign electronically.' }, { status: 400 });
  }
  if (!signatureMatches(name, client.company.signatoryName)) {
    return NextResponse.json(
      { error: `Type the signatory's full name, ${client.company.signatoryName}, to sign.` },
      { status: 400 },
    );
  }
  if (typeof body.agreementHash !== 'string' || !/^[0-9a-f]{64}$/.test(body.agreementHash)) {
    return NextResponse.json({ error: 'Reload the page and review the agreement before signing.' }, { status: 400 });
  }

  try {
    const result = await signAgreement(client.id, body.agreementHash, {
      name,
      network: signerNetwork(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, ...(result.changed ? { changed: true } : {}) }, { status: result.status });
    }
    await writeAudit({
      actorEmail: result.value.signedEmail,
      action: 'eor.agreement.sign',
      target: client.id,
      metadata: { version: result.value.agreementVersion, hash: result.value.agreementHash },
    });
    await deliverSoon();
    return NextResponse.json(await portalView(result.value));
  } catch (error) {
    console.error('Onboarding sign failed', error);
    return NextResponse.json({ error: 'Unable to sign. Please try again.' }, { status: 500 });
  }
}
