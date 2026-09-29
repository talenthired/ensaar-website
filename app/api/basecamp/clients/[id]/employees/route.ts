import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName } from '@/lib/basecamp/actor';
import { deliverSoon } from '@/lib/notify/outbox';
import { getCompany } from '@/lib/eor/companies';
import { MAX_BATCH, addEmployees, listEmployees, type EmployeeFilter } from '@/lib/eor/employees';
import { isEmployeeStatus, validateEmployee, type EmployeeInput, type Errors } from '@/lib/eor/onboarding';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const FILTERS = ['all', 'current', 'needs_action', 'starting_soon'];

/** One company's employees, a page at a time, with search, status filter and counts. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  const raw = params.get('filter') ?? 'current';
  const filter = (FILTERS.includes(raw) || isEmployeeStatus(raw) ? raw : 'current') as EmployeeFilter;
  return NextResponse.json(
    await listEmployees({ companyId: id, q: params.get('q'), filter, page: params.get('page'), pageSize: params.get('pageSize') }),
  );
}

/**
 * Add employees: one from the form, or up to MAX_BATCH rows from a CSV import.
 * Every row is validated first; if any row is wrong nothing is added, and the
 * errors come back per row so the admin can fix the spreadsheet.
 */
export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const company = await getCompany(id);
  if (!company) return NextResponse.json({ error: 'No such client.' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { employees?: unknown; send?: unknown };
  const rows = Array.isArray(body.employees) ? body.employees : [];
  if (rows.length === 0) return NextResponse.json({ error: 'Add at least one employee.' }, { status: 400 });
  if (rows.length > MAX_BATCH) return NextResponse.json({ error: `Add at most ${MAX_BATCH} employees at a time.` }, { status: 400 });

  const valid: EmployeeInput[] = [];
  const rowErrors: Array<{ row: number; errors: Errors }> = [];
  rows.forEach((row, index) => {
    const result = validateEmployee(row, { defaultFeeUsd: company.defaultFeeUsd });
    if (result.ok) valid.push(result.value);
    else rowErrors.push({ row: index + 1, errors: result.errors });
  });
  if (rowErrors.length) {
    return NextResponse.json(
      { error: rowErrors.length === 1 && rows.length === 1 ? 'Please check the highlighted fields.' : `${rowErrors.length} of ${rows.length} rows need fixing. Nothing was added.`, rowErrors },
      { status: 400 },
    );
  }

  const send = body.send === true;
  const added = await addEmployees(id, valid, actorName(gate.session), { send });
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: added.status });
  await writeAudit({
    actorId: gate.session.userId,
    actorEmail: gate.session.email,
    action: 'eor.employees.add',
    target: id,
    metadata: { count: added.value.length, sent: send },
  });
  if (send) await deliverSoon();
  return NextResponse.json({ added: added.value.length, employees: added.value }, { status: 201 });
}
