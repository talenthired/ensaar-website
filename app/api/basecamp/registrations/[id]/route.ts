import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { deleteRegistration, isRegistrationStatus, setRegistrationStatus } from '@/lib/events/registrations';
import { writeAudit } from '@/lib/basecamp/audit';

export const runtime = 'nodejs';

/** Move a registration between registered / waitlisted / cancelled / attended. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'registrations:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (!isRegistrationStatus(body.status)) {
    return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 });
  }
  try {
    const changed = await setRegistrationStatus(id, body.status);
    if (!changed) return NextResponse.json({ error: 'No such registration.' }, { status: 404 });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'registration.status',
      target: id,
      metadata: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Registration update failed', error);
    return NextResponse.json({ error: 'Unable to update that registration.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'registrations:write');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  try {
    const removed = await deleteRegistration(id);
    if (!removed) return NextResponse.json({ error: 'No such registration.' }, { status: 404 });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'registration.delete',
      target: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Registration delete failed', error);
    return NextResponse.json({ error: 'Unable to remove that registration.' }, { status: 500 });
  }
}
