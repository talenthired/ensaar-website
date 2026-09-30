import 'server-only';

import { NextResponse } from 'next/server';
import { MAX_DOCUMENT_BYTES, cleanFilename, isDocumentKind, validateDocumentBytes } from './onboarding';

type Upload = { kind: string; filename: string; contentType: 'application/pdf' | 'image/png' | 'image/jpeg'; data: Buffer };

/**
 * Read one company document from a multipart request: PDF, PNG or JPEG, checked
 * for structural completeness, 10 MB at most. The same checks whether the
 * customer uploads it in the portal or Ensaar uploads it for them in Basecamp.
 */
export async function readDocumentUpload(request: Request): Promise<{ ok: true; upload: Upload } | { ok: false; response: NextResponse }> {
  const refuse = (error: string, status: number) => ({ ok: false as const, response: NextResponse.json({ error }, { status }) });

  // Only multipart with a declared length is read, and never more than the cap:
  // formData() would otherwise buffer an unbounded chunked body.
  const declared = Number(request.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared <= 0) return refuse('Choose a file to upload.', 411);
  if (declared > MAX_DOCUMENT_BYTES + 64 * 1024) return refuse('That file is larger than 10 MB.', 413);
  if (!(request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) return refuse('Choose a file to upload.', 415);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  if (!(file instanceof File) || !isDocumentKind(kind)) return refuse('Choose a file to upload.', 400);
  if (file.size === 0) return refuse('That file is empty.', 400);
  if (file.size > MAX_DOCUMENT_BYTES) return refuse('That file is larger than 10 MB.', 413);

  const data = Buffer.from(await file.arrayBuffer());
  const checked = validateDocumentBytes(data);
  if (!checked.ok) return refuse(checked.reason, 422);
  return { ok: true, upload: { kind: kind as string, filename: cleanFilename(file.name), contentType: checked.contentType, data } };
}
