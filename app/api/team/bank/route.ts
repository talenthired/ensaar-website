import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { employeeRecordsView, saveBank, validateBank } from '@/lib/eor/employee-records';
import { requireTeam } from '@/lib/eor/team-auth';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** The employee gives (or changes) the account their salary is paid into. */
export async function PUT(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const limit = await rateLimit(clientKey(request, `team-bank:${gate.employee.id}`), 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Try again shortly.');
  const checked = validateBank(await request.json().catch(() => ({})));
  if (!checked.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: checked.errors }, { status: 400 });
  await saveBank(gate.employee.id, checked.value);
  // The audit records that it changed, never the number itself.
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.bank.save', target: gate.employee.id, metadata: { ifsc: checked.value.ifsc } });
  return NextResponse.json(await employeeRecordsView(gate.employee, 'employee'));
}
