import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { completeCompanyDetails } from '@/lib/eor/companies';
import { requirePortal } from '@/lib/eor/portal-auth';
import { companyView } from '@/lib/eor/views';

export const runtime = 'nodejs';

/** Fill in details that were left for later: the signatory's title, the billing email, the state of formation. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const saved = await completeCompanyDetails(gate.ctx.companyId, await request.json().catch(() => ({})));
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.company.details.complete', target: gate.ctx.companyId });
  return NextResponse.json(await companyView(saved.value, gate.ctx));
}
