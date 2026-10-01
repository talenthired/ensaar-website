import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { getEmployeeFile } from '@/lib/eor/employee-records';

export const runtime = 'nodejs';

/** A file an employee gave Ensaar (bank proof, relieving letter), for staff. Every download is audited. */
export async function GET(request: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { fileId } = await context.params;
  const file = await getEmployeeFile(fileId);
  if (!file) return NextResponse.json({ error: 'No such file.' }, { status: 404 });
  await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.employee.file.download', target: file.employeeId, metadata: { file: fileId, kind: file.kind } });
  return new NextResponse(new Uint8Array(file.content), {
    headers: {
      'content-type': file.contentType,
      'content-disposition': `inline; filename="${file.filename.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
