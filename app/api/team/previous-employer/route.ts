import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { employeeRecordsView, setNoPreviousEmployer } from '@/lib/eor/employee-records';
import { requireTeam } from '@/lib/eor/team-auth';

export const runtime = 'nodejs';

/** The employee says this is their first job, so no relieving letter is due (or takes that back). */
export async function PUT(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { none?: unknown };
  if (typeof body.none !== 'boolean') return NextResponse.json({ error: 'Say whether you had a previous employer.' }, { status: 400 });
  await setNoPreviousEmployer(gate.employee.id, body.none);
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.previous_employer', target: gate.employee.id, metadata: { none: body.none } });
  return NextResponse.json(await employeeRecordsView(gate.employee, 'employee'));
}
