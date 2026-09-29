import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { deleteCompanyDocument, getCompanyDocumentFile } from '@/lib/eor/companies';
import { requirePortal } from '@/lib/eor/portal-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** Download one of the company's documents. Scoped to the signed-in company; always an attachment. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const file = await getCompanyDocumentFile(gate.ctx.companyId, id).catch(() => null);
  if (!file) return NextResponse.json({ error: 'No such document.' }, { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'content-type': file.contentType,
      'content-disposition': `attachment; filename="${file.filename.replace(/"/g, '')}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
    },
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const removed = await deleteCompanyDocument(gate.ctx.companyId, id);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });
  await writeAudit({ actorEmail: gate.ctx.user.email, action: 'eor.document.delete', target: gate.ctx.companyId });
  return NextResponse.json({ ok: true });
}
