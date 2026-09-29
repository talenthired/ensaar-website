import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { portalGate } from '@/lib/eor/portal';
import { deleteDocument, getDocumentFile } from '@/lib/eor/store';

export const runtime = 'nodejs';

type Context = { params: Promise<{ docId: string }> };

/**
 * Download one of the customer's own uploads (EOR-06). Scoped to the client the
 * token belongs to, so another customer's id matches nothing. Always an
 * attachment with nosniff: never rendered inline on ensaar.com's origin.
 */
export async function GET(request: NextRequest, context: Context) {
  const gate = await portalGate(request, 'read', 120);
  if (!gate.ok) return gate.response;
  const { docId } = await context.params;
  const file = await getDocumentFile(gate.client.id, docId).catch(() => null);
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

/** Remove an uploaded document, until the agreement is signed. */
export async function DELETE(request: NextRequest, context: Context) {
  const gate = await portalGate(request, 'write', 60);
  if (!gate.ok) return gate.response;
  const { docId } = await context.params;
  const removed = await deleteDocument(gate.client.id, docId);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: removed.status });
  await writeAudit({ actorEmail: gate.client.contactEmail, action: 'eor.document.delete', target: gate.client.id });
  return NextResponse.json({ ok: true });
}
