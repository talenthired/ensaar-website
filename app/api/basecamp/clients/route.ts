import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon, emailConfigured, listUndelivered } from '@/lib/notify/outbox';
import { AGREEMENT_VERSION } from '@/lib/eor/agreement';
import {
  createCompany,
  findCompanyByIdempotencyKey,
  findOpenCompanyFor,
  getTemplateApproval,
  listCompanies,
  type CompanyFilter,
} from '@/lib/eor/companies';
import { validateCompanyInvite } from '@/lib/eor/onboarding';

export const runtime = 'nodejs';

const FILTERS: CompanyFilter[] = ['all', 'needs_action', 'setting_up', 'active', 'cancelled'];

/**
 * Client companies a page at a time, with headcount, plus the state of the
 * things that block everyone: the agreement's legal sign-off and undelivered email.
 */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const params = request.nextUrl.searchParams;
  const raw = params.get('filter') as CompanyFilter | null;
  const filter = raw && FILTERS.includes(raw) ? raw : 'all';
  try {
    // Opportunistic: retries anything due whenever staff look at the list.
    await deliverSoon();
    const [page, approval, undelivered] = await Promise.all([
      listCompanies({ q: params.get('q'), filter, page: params.get('page'), pageSize: params.get('pageSize') }),
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

/** Create a client company and invite its contact to the portal. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = validateCompanyInvite(body);
  if (!result.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  const idempotencyKey = typeof body.idempotencyKey === 'string' && /^[0-9a-f-]{36}$/i.test(body.idempotencyKey) ? body.idempotencyKey : null;

  try {
    // The same submission arriving twice returns what the first one created, and sends nothing again.
    const previous = idempotencyKey ? await findCompanyByIdempotencyKey(idempotencyKey) : null;
    if (previous) return NextResponse.json({ company: previous, replayed: true });

    if (body.confirmDuplicate !== true) {
      const duplicate = await findOpenCompanyFor(result.value.contactEmail, result.value.companyName);
      if (duplicate) {
        return NextResponse.json(
          { error: `${duplicate.companyName} is already a client (contact ${duplicate.contactEmail}). Add employees to it instead.`, duplicate: { id: duplicate.id } },
          { status: 409 },
        );
      }
    }
    // Assisted: Ensaar will enter the details and documents, so the contact is not asked to.
    const assisted = body.assisted === true;
    const company = await createCompany(result.value, gate.session.userId, idempotencyKey, assisted);
    await deliverSoon();
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.company.create',
      target: company.id,
      metadata: { company: company.companyName, contact: company.contactEmail, assisted },
    });
    return NextResponse.json({ company, emailConfigured: emailConfigured() }, { status: 201 });
  } catch (error) {
    console.error('Client create failed', error);
    return NextResponse.json({ error: 'Unable to create that client.' }, { status: 500 });
  }
}
