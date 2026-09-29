import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deliverSoon } from '@/lib/notify/outbox';
import { getCompany, saveCompanyDetails } from '@/lib/eor/companies';
import { rebuildPendingSchedules } from '@/lib/eor/employees';
import { validateCompany } from '@/lib/eor/onboarding';
import { requirePortal } from '@/lib/eor/portal-auth';
import { companyView } from '@/lib/eor/views';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in person's company: status, details, documents, agreement, headcount. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const company = await getCompany(gate.ctx.companyId);
  if (!company) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  return NextResponse.json(await companyView(company, gate.ctx));
}

/** Save the company details (any contact may, until the agreement is signed). */
export async function PUT(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const result = validateCompany(await request.json().catch(() => ({})));
  if (!result.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: result.errors }, { status: 400 });
  try {
    const saved = await saveCompanyDetails(gate.ctx.companyId, result.value, rebuildPendingSchedules);
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
    await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.company.details', target: gate.ctx.companyId });
    await deliverSoon();
    return NextResponse.json(await companyView(saved.value, gate.ctx));
  } catch (error) {
    console.error('Portal company save failed', error);
    return NextResponse.json({ error: 'Unable to save. Please try again.' }, { status: 500 });
  }
}
