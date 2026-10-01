import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { renderEmploymentDocumentHtml } from '@/lib/eor/employment-docs';
import { evidenceFor, getEmployeeDocument } from '@/lib/eor/team';

export const runtime = 'nodejs';

/** An issued document exactly as issued, with how it was signed: for staff. */
export async function GET(request: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { docId } = await context.params;
  const doc = await getEmployeeDocument(docId);
  if (!doc) return NextResponse.json({ error: 'No such document.' }, { status: 404 });
  const ev = evidenceFor(doc);
  const html = renderEmploymentDocumentHtml(doc.document, {
    logoUrl: '/ensaar-logo.png',
    generatedNote:
      doc.status === 'void'
        ? `Void: ${doc.voidReason ?? 'replaced'}. Kept for the record.`
        : doc.status === 'signed'
          ? `Signed by the employee${doc.signedIp ? ` from ${doc.signedIp}` : ''}.`
          : 'Issued and waiting for the employee to sign.',
    evidence: ev,
  });
  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' },
  });
}
