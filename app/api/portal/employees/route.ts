import { NextRequest, NextResponse } from 'next/server';
import { listEmployees, type EmployeeFilter } from '@/lib/eor/employees';
import { isEmployeeStatus } from '@/lib/eor/onboarding';
import { requirePortal } from '@/lib/eor/portal-auth';
import { employeeListItem } from '@/lib/eor/views';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILTERS = ['all', 'current', 'starting_soon'];

/** The company's employees, a page at a time, with search and a status filter. Never drafts. */
export async function GET(request: NextRequest) {
  const gate = await requirePortal(request);
  if (!gate.ok) return gate.response;
  const params = request.nextUrl.searchParams;
  const raw = params.get('filter') ?? 'current';
  const filter = (FILTERS.includes(raw) || (isEmployeeStatus(raw) && raw !== 'draft') ? raw : 'current') as EmployeeFilter;
  const result = await listEmployees({
    companyId: gate.ctx.companyId,
    q: params.get('q'),
    filter,
    page: params.get('page'),
    pageSize: params.get('pageSize'),
    hideDrafts: true,
  });
  return NextResponse.json({ ...result, items: result.items.map(employeeListItem) });
}
