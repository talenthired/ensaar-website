import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { listEmployees, type EmployeeFilter } from '@/lib/eor/employees';
import { isEmployeeStatus } from '@/lib/eor/onboarding';

export const runtime = 'nodejs';

const FILTERS = ['all', 'current', 'needs_action', 'starting_soon'];

/** Every employee across every client, for operations: search, filter, page. */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const params = request.nextUrl.searchParams;
  const raw = params.get('filter') ?? 'current';
  const filter = (FILTERS.includes(raw) || isEmployeeStatus(raw) ? raw : 'current') as EmployeeFilter;
  return NextResponse.json(await listEmployees({ q: params.get('q'), filter, page: params.get('page'), pageSize: params.get('pageSize') }));
}
