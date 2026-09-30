import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed } from '@/lib/basecamp/actor';
import { addCompanyDocument } from '@/lib/eor/companies';
import { readDocumentUpload } from '@/lib/eor/upload';

export const runtime = 'nodejs';

/**
 * Upload a company document for a customer who sent it to Ensaar instead of
 * using the portal. Same file checks as the portal; the record names the staff
 * member, and the document still needs its review before countersigning.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const { id } = await context.params;

  const read = await readDocumentUpload(request);
  if (!read.ok) return read.response;
  try {
    const added = await addCompanyDocument({ companyId: id, ...read.upload, uploadedBy: actorName(gate.session) });
    if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'eor.document.upload',
      target: id,
      metadata: { kind: read.upload.kind, bytes: read.upload.data.length, forCustomer: true },
    });
    return NextResponse.json({ document: added.value }, { status: 201 });
  } catch (error) {
    console.error('Client document upload failed', error);
    return NextResponse.json({ error: 'Unable to upload.' }, { status: 500 });
  }
}
