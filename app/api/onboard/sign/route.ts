import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { isEditable, missingRequiredDocuments, signatureMatches } from '@/lib/eor/onboarding';
import { portalGate, portalView, signerNetwork } from '@/lib/eor/portal';
import { listDocuments, signAgreement } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * Sign the agreement. Every precondition is re-checked here rather than trusted
 * from the page: company details saved, required documents present, the typed
 * name matching the signatory, explicit consent, and the agreement text being
 * exactly the text the customer was shown.
 */
export async function POST(request: NextRequest) {
  const gate = await portalGate(request, 'sign', 10);
  if (!gate.ok) return gate.response;
  const { client } = gate;

  if (!isEditable(client.status)) {
    return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 });
  }
  if (!client.company) {
    return NextResponse.json({ error: 'Complete your company details first.' }, { status: 400 });
  }
  const missing = missingRequiredDocuments((await listDocuments(client.id)).map((d) => d.kind));
  if (missing.length) {
    return NextResponse.json({ error: `Upload these first: ${missing.map((d) => d.label).join(', ')}.` }, { status: 400 });
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
    const result = await signAgreement(client, body.agreementHash, {
      name,
      title: client.company.signatoryTitle,
      network: signerNetwork(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    if (result === 'changed') {
      return NextResponse.json(
        { error: 'The agreement changed since you opened it. Please review the updated version and sign again.', changed: true },
        { status: 409 },
      );
    }
    if (!result) return NextResponse.json({ error: 'This agreement can no longer be signed.' }, { status: 409 });
    await writeAudit({
      actorEmail: client.company.signatoryEmail,
      action: 'eor.agreement.sign',
      target: client.id,
      metadata: { version: result.agreementVersion, hash: result.agreementHash },
    });
    return NextResponse.json(await portalView(result));
  } catch (error) {
    console.error('Onboarding sign failed', error);
    return NextResponse.json({ error: 'Unable to sign. Please try again.' }, { status: 500 });
  }
}
