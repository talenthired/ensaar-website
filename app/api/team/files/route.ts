import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { addEmployeeFile, employeeRecordsView, isEmployeeFileKind } from '@/lib/eor/employee-records';
import { requireTeam } from '@/lib/eor/team-auth';
import { readDocumentUpload } from '@/lib/eor/upload';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Upload proof of the bank account or a relieving letter: PDF, PNG or JPEG, 10 MB at most. */
export async function POST(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-upload:${gate.employee.id}`), 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many uploads. Try again shortly.');
  const read = await readDocumentUpload(request, isEmployeeFileKind);
  if (!read.ok) return read.response;
  const added = await addEmployeeFile(gate.employee.id, { ...read.upload, kind: read.upload.kind as never }, gate.employee.employeeEmail ?? 'employee');
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.file.upload', target: gate.employee.id, metadata: { kind: read.upload.kind, bytes: read.upload.data.length } });
  return NextResponse.json(await employeeRecordsView(gate.employee, 'employee'), { status: 201 });
}
