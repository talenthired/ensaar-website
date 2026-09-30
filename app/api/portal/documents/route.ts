import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { addCompanyDocument } from '@/lib/eor/companies';
import { requirePortal } from '@/lib/eor/portal-auth';
import { readDocumentUpload } from '@/lib/eor/upload';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Upload one company document: PDF, PNG or JPEG, checked for structural completeness, 10 MB at most. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-upload:${gate.ctx.user.id}`), 30, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many uploads. Try again shortly.');

  const read = await readDocumentUpload(request);
  if (!read.ok) return read.response;
  const added = await addCompanyDocument({ companyId: gate.ctx.companyId, ...read.upload, uploadedBy: gate.ctx.user.email });
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
  await writeAudit({
    actorEmail: gate.ctx.user.email,
    action: 'eor.document.upload',
    target: gate.ctx.companyId,
    metadata: { kind: read.upload.kind, bytes: read.upload.data.length },
  });
  return NextResponse.json({ document: added.value }, { status: 201 });
}
