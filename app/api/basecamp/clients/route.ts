import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { onboardingLink, sendOnboardingEmail } from '@/lib/eor/email';
import { validateHire } from '@/lib/eor/onboarding';
import { createClient, listClients } from '@/lib/eor/store';

export const runtime = 'nodejs';

/** Every EOR onboarding, newest first. */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ clients: await listClients() });
  } catch (error) {
    console.error('Client list failed', error);
    return NextResponse.json({ error: 'Unable to load clients.' }, { status: 500 });
  }
}

/** Start an onboarding and send the customer their link. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;

  const result = validateHire(await request.json().catch(() => ({})));
  if (!result.ok) {
    return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  }

  try {
    const { client, token } = await createClient(result.value, gate.session.userId);
    const link = onboardingLink(token);
    const emailed = await sendOnboardingEmail({
      to: client.contactEmail,
      contactName: client.contactName,
      employeeName: client.employeeName,
      link,
    });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.invite',
      target: client.id,
      metadata: { company: client.companyName, contact: client.contactEmail, emailed },
    });
    // Returned once so it can be copied when email is not configured; only its hash is stored.
    return NextResponse.json({ client, link, emailed }, { status: 201 });
  } catch (error) {
    console.error('Client invite failed', error);
    const message =
      error instanceof Error && /DATABASE_URL/.test(error.message)
        ? 'Basecamp needs a database before clients can be onboarded.'
        : 'Unable to start that onboarding.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
