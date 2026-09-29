import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { MAX_DOCUMENT_BYTES, cleanFilename, isDocumentKind, isEditable, validateDocumentBytes } from '@/lib/eor/onboarding';
import { portalGate } from '@/lib/eor/portal';
import { addDocument } from '@/lib/eor/store';

export const runtime = 'nodejs';

/**
 * Upload one document: PDF, PNG or JPEG, identified by content and checked for
 * structural completeness, 10 MB at most.
 */
export async function POST(request: NextRequest) {
  const gate = await portalGate(request, 'upload', 30);
  if (!gate.ok) return gate.response;
  const { client } = gate;
  if (!isEditable(client.status)) {
    return NextResponse.json({ error: 'This onboarding is already signed.' }, { status: 409 });
  }

  // Only multipart with a declared length is read, and never more than the cap.
  // A chunked body has no length to check up front, so it is refused rather than
  // buffered: formData() would otherwise read an unbounded body into memory.
  const declared = Number(request.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared <= 0) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 411 });
  }
  if (declared > MAX_DOCUMENT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'That file is larger than 10 MB.' }, { status: 413 });
  }
  if (!(request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 415 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  if (!(file instanceof File) || !isDocumentKind(kind)) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'That file is larger than 10 MB.' }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const checked = validateDocumentBytes(data);
  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 422 });

  try {
    const added = await addDocument({
      clientId: client.id,
      kind: kind as string,
      filename: cleanFilename(file.name),
      contentType: checked.contentType,
      data,
    });
    if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
    await writeAudit({
      actorEmail: client.contactEmail,
      action: 'eor.document.upload',
      target: client.id,
      metadata: { kind, bytes: data.length },
    });
    return NextResponse.json({ document: added.value }, { status: 201 });
  } catch (error) {
    console.error('Onboarding upload failed', error);
    return NextResponse.json({ error: 'Unable to upload. Please try again.' }, { status: 500 });
  }
}
