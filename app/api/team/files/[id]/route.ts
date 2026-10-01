import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { employeeRecordsView, getEmployeeFile, removeEmployeeFile } from '@/lib/eor/employee-records';
import { requireTeam } from '@/lib/eor/team-auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** Download one of your own files. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const file = await getEmployeeFile(id, gate.employee.id);
  if (!file) return NextResponse.json({ error: 'No such file.' }, { status: 404 });
  return new NextResponse(new Uint8Array(file.content), {
    headers: {
      'content-type': file.contentType,
      'content-disposition': `attachment; filename="${file.filename.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Remove one of your own files, to upload a better one. */
export async function DELETE(request: NextRequest, context: Context) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!(await removeEmployeeFile(id, gate.employee.id))) return NextResponse.json({ error: 'No such file.' }, { status: 404 });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.file.remove', target: gate.employee.id, metadata: { file: id } });
  return NextResponse.json(await employeeRecordsView(gate.employee, 'employee'));
}
