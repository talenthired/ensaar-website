import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { addCompanyDocument } from '@/lib/eor/companies';
import { MAX_DOCUMENT_BYTES, cleanFilename, isDocumentKind, validateDocumentBytes } from '@/lib/eor/onboarding';
import { requirePortal } from '@/lib/eor/portal-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Upload one company document: PDF, PNG or JPEG, checked for structural completeness, 10 MB at most. */
export async function POST(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `portal-upload:${gate.ctx.user.id}`), 30, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many uploads. Try again shortly.');

  // Only multipart with a declared length is read, and never more than the cap:
  // formData() would otherwise buffer an unbounded chunked body.
  const declared = Number(request.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared <= 0) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 411 });
  if (declared > MAX_DOCUMENT_BYTES + 64 * 1024) return NextResponse.json({ error: 'That file is larger than 10 MB.' }, { status: 413 });
  if (!(request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 415 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  if (!(file instanceof File) || !isDocumentKind(kind)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: 'That file is larger than 10 MB.' }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer());
  const checked = validateDocumentBytes(data);
  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 422 });

  const added = await addCompanyDocument({
    companyId: gate.ctx.companyId,
    kind: kind as string,
    filename: cleanFilename(file.name),
    contentType: checked.contentType,
    data,
    uploadedBy: gate.ctx.user.email,
  });
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.document.upload', target: gate.ctx.companyId, metadata: { kind, bytes: data.length } });
  return NextResponse.json({ document: added.value }, { status: 201 });
}
