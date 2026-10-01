import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { writeAudit } from '@/lib/basecamp/audit';
import { actorName, requireNamed, requireSignatory, signatoryLabel, signatoryTitle } from '@/lib/basecamp/actor';
import { deliverSoon, listMessages } from '@/lib/notify/outbox';
import { getCompany, listVoidedSignatures } from '@/lib/eor/companies';
import {
  changeEmployee,
  countersignSchedules,
  getEmployee,
  getScheduleText,
  sendForSignature,
  updateEmployee,
} from '@/lib/eor/employees';
import { employeeContactable, validateEmployee } from '@/lib/eor/onboarding';
import type { Outcome } from '@/lib/eor/outcome';
import { HOLIDAYS_PER_YEAR, choicesAllowed } from '@/lib/eor/holidays';
import { decideHolidayPlan, holidayView, isDocumentKind, issueEmployeeDocument, listEmployeeDocuments, taxView } from '@/lib/eor/team';
import { inviteEmployee } from '@/lib/eor/team-auth';
import { holidayYear } from '@/lib/eor/years';
import { remindEmployeeNow } from '@/lib/eor/reminders';
import { employeeRecordsView } from '@/lib/eor/employee-records';
import { requireDatabase } from '@/lib/db/client';
import { emailConfigured } from '@/lib/notify/outbox';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/** One employee with their company, schedule text, voided signatures and related emails. */
export async function GET(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:read');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const employee = await getEmployee(id);
  if (!employee) return NextResponse.json({ error: 'No such employee.' }, { status: 404 });
  const year = holidayYear(request.nextUrl.searchParams.get('year'));
  const [company, scheduleText, voided, messages, documents, tax, holidays, records] = await Promise.all([
    getCompany(employee.companyId),
    getScheduleText(id),
    listVoidedSignatures(employee.companyId, id),
    listMessages(employee.companyId),
    listEmployeeDocuments(id),
    taxView(employee),
    holidayView(employee.companyId, year, 'staff'),
    employeeRecordsView(employee, 'staff'),
  ]);
  return NextResponse.json({
    employee,
    company: company && { id: company.id, status: company.status, name: company.company?.legalName ?? company.companyName },
    scheduleText,
    voided,
    messages: messages.filter((m) => m.kind.startsWith('eor.schedules')).slice(0, 10),
    documents,
    records,
    tax,
    holidays: { ...holidays, allowed: choicesAllowed(holidays.catalogue), perYear: HOLIDAYS_PER_YEAR },
    emailConfigured: emailConfigured(),
    viewer: { email: gate.session.email, bootstrap: gate.session.bootstrap },
  });
}

const str = (value: unknown, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export async function POST(request: NextRequest, context: Context) {
  const gate = await requireBasecamp(request, 'clients:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const employee = await getEmployee(id);
  if (!employee) return NextResponse.json({ error: 'No such employee.' }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const actor = actorName(gate.session);
  if (['update', 'countersign', 'exit', 'cancel', 'issue_document', 'invite_employee', 'holiday_decision'].includes(action)) {
    const refused = requireNamed(gate.session);
    if (refused) return refused;
  }

  const done = async (outcome: Outcome<unknown>, auditAction: string, metadata?: Record<string, unknown>) => {
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: auditAction, target: id, metadata });
    await deliverSoon();
    return NextResponse.json({ ok: true });
  };

  switch (action) {
    case 'update': {
      const input = validateEmployee({ ...employee, ...(body.employee as Record<string, unknown>) }, { allowPastStart: true });
      if (!input.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', errors: input.errors }, { status: 400 });
      return done(await updateEmployee(id, input.value, actor), 'eor.employee.update', { status: employee.status });
    }
    case 'send':
      return done(await sendForSignature(employee.companyId, [id]), 'eor.schedules.send', { count: 1 });
    case 'countersign': {
      const unsigned = requireSignatory(gate.session);
      if (unsigned) return unsigned;
      return done(
        await countersignSchedules(employee.companyId, [id], signatoryLabel(gate.session), { confirmPastStart: body.confirmPastStart === true }),
        'eor.schedules.countersign',
        { count: 1, confirmPastStart: body.confirmPastStart === true },
      );
    }
    case 'step':
      return done(await changeEmployee(id, { kind: 'step', step: str(body.step, 40), done: body.done === true }, actor), 'eor.employee.step', {
        step: body.step,
        done: body.done === true,
      });
    case 'owner':
      return done(await changeEmployee(id, { kind: 'owner', owner: str(body.owner, 200) }, actor), 'eor.employee.owner');
    case 'activate':
      return done(await changeEmployee(id, { kind: 'activate' }, actor), 'eor.employee.activate');
    case 'exit':
      return done(await changeEmployee(id, { kind: 'exit', exitDate: str(body.exitDate, 10), reason: str(body.reason) }, actor), 'eor.employee.exit');
    case 'cancel':
      return done(await changeEmployee(id, { kind: 'cancel' }, actor), 'eor.employee.cancel');
    // The employee portal: documents to sign, an invitation, and Ensaar deciding a holiday choice.
    case 'issue_document': {
      const unsigned = requireSignatory(gate.session);
      if (unsigned) return unsigned;
      if (!isDocumentKind(body.kind)) return NextResponse.json({ error: 'Choose the offer letter or the employment agreement.' }, { status: 400 });
      const issued = await issueEmployeeDocument(id, body.kind, { name: gate.session.name ?? '', title: signatoryTitle(), label: signatoryLabel(gate.session) });
      if (!issued.ok) return NextResponse.json({ error: issued.error }, { status: issued.status });
      await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.employee.document.issue', target: id, metadata: { kind: body.kind, hash: issued.value.document.hash } });
      // What the employee still needs to give Ensaar is asked for alongside (once a day at most).
      await remindEmployeeNow(id).catch((error) => console.error('Outstanding reminder failed', error));
      await deliverSoon();
      // The link is returned so staff can pass it on directly if email is not working.
      return NextResponse.json({ document: issued.value.document, link: issued.value.link, emailConfigured: emailConfigured() });
    }
    case 'invite_employee': {
      if (!employee.employeeEmail) return NextResponse.json({ error: "Add the employee's email address first." }, { status: 409 });
      if (!employeeContactable(employee.status, (await getCompany(employee.companyId))?.status)) {
        return NextResponse.json({ error: 'Not yet: the client has to sign the agreement, and this Schedule A has to be sent to them, first. Until then the employee hears nothing from Ensaar.' }, { status: 409 });
      }
      const link = await requireDatabase().begin((tx) => inviteEmployee(tx, employee, 'You can now sign in to the Ensaar employee portal.'));
      await writeAudit({ actorId: gate.session.userId, actorEmail: gate.session.email, action: 'eor.employee.invite', target: id });
      await remindEmployeeNow(id).catch((error) => console.error('Outstanding reminder failed', error));
      await deliverSoon();
      return NextResponse.json({ link, emailConfigured: emailConfigured() });
    }
    case 'holiday_decision': {
      if (body.decision !== 'approved' && body.decision !== 'rejected') return NextResponse.json({ error: 'Approve or ask for changes.' }, { status: 400 });
      return done(
        await decideHolidayPlan({ companyId: employee.companyId, year: holidayYear(String(body.year ?? '')), approve: body.decision === 'approved', note: str(body.note, 500) || null, by: actor, role: 'ensaar' }),
        'eor.employee.holidays.decide',
        { year: body.year, decision: body.decision },
      );
    }
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
}
