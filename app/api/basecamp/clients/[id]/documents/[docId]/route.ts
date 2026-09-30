import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { requireNamed } from '@/lib/basecamp/actor';
import { deleteCompanyDocument, getCompanyDocumentFile } from '@/lib/eor/companies';

export const runtime = 'nodejs';

/**
 * Download a client's document. Always as an attachment with nosniff, so an
 * uploaded file is never rendered inline on ensaar.com's origin.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id, docId } = await context.params;
  const file = await getCompanyDocumentFile(id, docId).catch(() => null);
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

/** Remove a document while the company is still being set up (a wrong file uploaded for the customer, say). */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const { id, docId } = await context.params;
  try {
    const removed = await deleteCompanyDocument(id, docId);
    if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.document.delete', target: id, metadata: { documentId: docId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Client document delete failed', error);
    return NextResponse.json({ error: 'Unable to remove that document.' }, { status: 500 });
  }
}
