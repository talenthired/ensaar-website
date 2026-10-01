import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { compareRegimes, readDeclarations } from '@/lib/eor/tax';
import { saveEmployeeTax } from '@/lib/eor/team';
import { requireTeam } from '@/lib/eor/team-auth';

export const runtime = 'nodejs';

/** Choose a tax regime and, for the old regime, declare investments. Returns both regimes worked out on the new figures. */
export async function PUT(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { regime?: unknown; declarations?: unknown };
  if (body.regime !== 'new' && body.regime !== 'old') return NextResponse.json({ error: 'Choose the new or the old regime.' }, { status: 400 });
  const declarations = readDeclarations(body.declarations);
  const saved = await saveEmployeeTax(gate.employee.id, body.regime, declarations);
  await writeAudit({ actorEmail: gate.employee.employeeEmail, action: 'team.tax.save', target: gate.employee.id, metadata: { regime: body.regime, taxYear: saved.taxYear } });
  return NextResponse.json({
    ...saved,
    comparison: compareRegimes({ annualGross: gate.employee.salaryInr, workState: gate.employee.workState, declarations }),
  });
}
