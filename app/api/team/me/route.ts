import { NextRequest, NextResponse } from 'next/server';
import { HOLIDAYS_PER_YEAR, choicesAllowed } from '@/lib/eor/holidays';
import { todayInIndia } from '@/lib/eor/onboarding';
import { salaryBreakup } from '@/lib/eor/salary';
import { DECLARATION_FIELDS } from '@/lib/eor/tax';
import { holidayView, listEmployeeDocuments, taxView } from '@/lib/eor/team';
import { requireTeam } from '@/lib/eor/team-auth';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Everything the signed-in employee sees: their job, documents, pay and tax, and holidays. Only their own. */
export async function GET(request: NextRequest) {
  const gate = await requireTeam(request);
  if (!gate.ok) return gate.response;
  const e = gate.employee;
  const year = holidayYear(request.nextUrl.searchParams.get('year'));
  const [documents, tax, holidays] = await Promise.all([listEmployeeDocuments(e.id), taxView(e), holidayView(e.companyId, year)]);
  return NextResponse.json({
    employee: { name: e.employeeName, email: e.employeeEmail, jobTitle: e.jobTitle, companyName: e.companyName, startDate: e.startDate, workState: e.workState, status: e.status },
    // The signing IP is evidence for Ensaar, not something to show back.
    documents: documents.filter((d) => d.status !== 'void').map((d) => ({ ...d, signedIp: null })),
    pay: { salaryInr: e.salaryInr, breakup: salaryBreakup(e.salaryInr) },
    tax: { ...tax, fields: DECLARATION_FIELDS },
    holidays: { ...holidays, allowed: choicesAllowed(holidays.catalogue), perYear: HOLIDAYS_PER_YEAR, from: todayInIndia() },
  });
}
