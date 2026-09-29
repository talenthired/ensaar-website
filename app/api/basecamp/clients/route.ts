import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon, emailConfigured, listUndelivered } from '@/lib/notify/outbox';
import { AGREEMENT_VERSION } from '@/lib/eor/agreement';
import { onboardingLink } from '@/lib/eor/email';
import { CLIENT_STATUSES, validateHire, type ClientStatus } from '@/lib/eor/onboarding';
import { createClient, findByIdempotencyKey, findOpenDuplicate, getTemplateApproval, listClients } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * A page of onboardings with search and filters, plus the state of the things
 * that block everyone: the agreement's legal sign-off and undelivered email.
 */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const filterStatus =
    status === 'needs_action' || status === 'all' || (CLIENT_STATUSES as readonly string[]).includes(status ?? '')
      ? (status as ClientStatus | 'needs_action' | 'all')
      : 'all';
  try {
    // Opportunistic: retries anything due whenever staff look at the queue.
    await deliverSoon();
    const [page, approval, undelivered] = await Promise.all([
      listClients({ q: params.get('q') ?? undefined, status: filterStatus, cursor: params.get('cursor') }),
      getTemplateApproval(),
      listUndelivered(),
    ]);
    return NextResponse.json({
      ...page,
      template: { version: AGREEMENT_VERSION, approval },
      email: { configured: emailConfigured(), undelivered },
      viewer: { role: gate.session.role, bootstrap: gate.session.bootstrap },
    });
  } catch (error) {
    console.error('Client list failed', error);
    return NextResponse.json({ error: 'Unable to load clients.' }, { status: 500 });
  }
}

/** Start an onboarding and send the customer their link. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = validateHire(body);
  if (!result.ok) {
    return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  }
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && /^[0-9a-f-]{36}$/i.test(body.idempotencyKey) ? body.idempotencyKey : null;

  try {
    // The same submission arriving twice (double click, retry after a timeout)
    // returns what the first one created, and sends nothing again.
    const previous = idempotencyKey ? await findByIdempotencyKey(idempotencyKey) : null;
    if (previous) return NextResponse.json({ client: previous, link: null, replayed: true }, { status: 200 });

    // A second onboarding for the same person is sometimes right (a new
    // engagement) and usually a mistake, so it needs an explicit confirmation.
    if (body.confirmDuplicate !== true) {
      const duplicate = await findOpenDuplicate(result.value);
      if (duplicate) {
        return NextResponse.json(
          {
            error: `${duplicate.employeeName} already has an open onboarding with ${duplicate.contactEmail}.`,
            duplicate: { id: duplicate.id, status: duplicate.status, createdAt: duplicate.createdAt },
          },
          { status: 409 },
        );
      }
    }

    const { client, token, replayed } = await createClient(result.value, gate.session.userId, idempotencyKey);
    if (replayed) {
      // The same submission arrived twice. Do not create or email anything again.
      return NextResponse.json({ client, link: null, replayed: true }, { status: 200 });
    }
    await deliverSoon();
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.invite',
      target: client.id,
      metadata: { company: client.companyName, contact: client.contactEmail },
    });
    // Returned once so it can be copied when email is not working; only its hash is stored.
    return NextResponse.json({ client, link: onboardingLink(token!), emailConfigured: emailConfigured() }, { status: 201 });
  } catch (error) {
    console.error('Client invite failed', error);
    const message =
      error instanceof Error && /DATABASE_URL/.test(error.message)
        ? 'Basecamp needs a database before clients can be onboarded.'
        : 'Unable to start that onboarding.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

