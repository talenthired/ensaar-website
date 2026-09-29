import { NextRequest, NextResponse } from 'next/server';
import { getEmployee } from '@/lib/eor/employees';
import { requirePortal } from '@/lib/eor/portal-auth';
import { employeeDetail } from '@/lib/eor/views';

export const runtime = 'nodejs';

/** One employee, with their schedule text and onboarding progress. Scoped to the signed-in company. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const employee = await getEmployee(id, gate.ctx.companyId);
  if (!employee || employee.status === 'draft') return NextResponse.json({ error: 'No such employee.' }, { status: 404 });
  return NextResponse.json(await employeeDetail(employee));
}
