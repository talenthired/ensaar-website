import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { getDocumentFile } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * Download a customer's document. Always as an attachment with nosniff, so an
 * uploaded file is never rendered inline on ensaar.com's origin.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id, docId } = await context.params;
  const file = await getDocumentFile(id, docId).catch(() => null);
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
