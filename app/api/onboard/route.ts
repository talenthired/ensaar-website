import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { isEditable, validateCompany } from '@/lib/eor/onboarding';
import { portalGate, portalView } from '@/lib/eor/portal';
import { getClient, saveCompany } from '@/lib/eor/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The customer onboarding portal's data. Public by necessity: the customer has
 * no account, so the link's token (sent in a header, see TOKEN_HEADER) is the
 * credential, and every route is throttled per token.
 */
export async function GET(request: NextRequest) {
  const gate = await portalGate(request, 'read', 120);
  if (!gate.ok) return gate.response;
  return NextResponse.json(await portalView(gate.client));
}

/** Save company details. Allowed until the agreement is signed. */
export async function PUT(request: NextRequest) {
  const gate = await portalGate(request, 'write', 60);
  if (!gate.ok) return gate.response;
  const { client } = gate;
  if (!isEditable(client.status)) {
    return NextResponse.json({ error: 'This onboarding is already signed and can no longer be changed.' }, { status: 409 });
  }

  const result = validateCompany(await request.json().catch(() => ({})));
  if (!result.ok) {
    return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  }

  try {
    if (!(await saveCompany(client.id, result.value))) {
      return NextResponse.json({ error: 'This onboarding can no longer be changed.' }, { status: 409 });
    }
    await writeAudit({ actorEmail: client.contactEmail, action: 'eor.company.save', target: client.id });
    const updated = await getClient(client.id);
    return NextResponse.json(await portalView(updated!));
  } catch (error) {
    console.error('Onboarding company save failed', error);
    return NextResponse.json({ error: 'Unable to save. Please try again.' }, { status: 500 });
  }
}
