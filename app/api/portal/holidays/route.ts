import { NextRequest, NextResponse } from 'next/server';
import { listCompanyHolidayPlans } from '@/lib/eor/team';
import { requirePortal } from '@/lib/eor/portal-auth';
import { holidayYear } from '@/lib/eor/years';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The holidays the company's employees have chosen for a year, waiting ones first. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const year = holidayYear(request.nextUrl.searchParams.get('year'));
  return NextResponse.json({ year, plans: await listCompanyHolidayPlans(gate.ctx.companyId, year) });
}
