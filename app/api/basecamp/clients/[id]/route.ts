import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { onboardingLink, sendOnboardingEmail } from '@/lib/eor/email';
import { portalView } from '@/lib/eor/portal';
import { approveClient, cancelClient, getClient, reissueToken } from '@/lib/eor/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** One onboarding: the full record, its documents and the agreement. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const client = await getClient(id).catch(() => null);
  if (!client) return NextResponse.json({ error: 'No such client.' }, { status: 404 });
  return NextResponse.json({ client, view: await portalView(client) });
}

/**
 * The three things Ensaar does to an onboarding after inviting:
 *   resend  - issue a fresh link (the old one stops working) and email it again
 *   approve - documents checked; countersign on Ensaar's behalf
 *   cancel  - stop it; the link stops working
 */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const client = await getClient(id).catch(() => null);
  if (!client) return NextResponse.json({ error: 'No such client.' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  const audit = (action: string, metadata?: Record<string, unknown>) =>
    writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action, target: id, metadata });

  try {
    if (body.action === 'resend') {
      const token = await reissueToken(id);
      if (!token) return NextResponse.json({ error: 'This onboarding was cancelled.' }, { status: 409 });
      const link = onboardingLink(token);
      const emailed = await sendOnboardingEmail({
        to: client.contactEmail,
        contactName: client.contactName,
        employeeName: client.employeeName,
        link,
      });
      await audit('eor.resend', { emailed });
      return NextResponse.json({ link, emailed });
    }

    if (body.action === 'approve') {
      // A countersignature binds Ensaar, so it must be attributable to a person.
      // The shared-password login has no identity behind it.
      if (gate.session.bootstrap || !gate.session.email) {
        return NextResponse.json(
          { error: 'Sign in with your own Basecamp account to countersign. The shared login cannot.' },
          { status: 403 },
        );
      }
      const signer = gate.session.name ? `${gate.session.name} (${gate.session.email})` : gate.session.email;
      if (!(await approveClient(id, signer))) {
        return NextResponse.json({ error: 'Only a signed onboarding can be approved.' }, { status: 409 });
      }
      await audit('eor.approve');
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'cancel') {
      if (!(await cancelClient(id))) {
        return NextResponse.json({ error: 'That onboarding cannot be cancelled.' }, { status: 409 });
      }
      await audit('eor.cancel');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('Client action failed', error);
    return NextResponse.json({ error: 'Unable to do that.' }, { status: 500 });
  }
}
