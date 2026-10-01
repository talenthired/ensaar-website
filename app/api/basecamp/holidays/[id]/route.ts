import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { requireNamed } from '@/lib/basecamp/actor';
import { removeHolidayCalendarEntry } from '@/lib/eor/team';

export const runtime = 'nodejs';

/** Remove a loaded holiday. Employees who chose it keep the choice only if they choose it again. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const refused = requireNamed(gate.session);
  if (refused) return refused;
  const { id } = await context.params;
  if (!(await removeHolidayCalendarEntry(id))) return NextResponse.json({ error: 'No such holiday.' }, { status: 404 });
  await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.holidays.remove', target: id });
  return NextResponse.json({ ok: true });
}
