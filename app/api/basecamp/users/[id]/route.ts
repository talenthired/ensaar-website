import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { countActiveOwners, getUserById, setUserActive, setUserRole } from '@/lib/basecamp/users';
import { writeAudit } from '@/lib/basecamp/audit';
import { canManageUser, isRole } from '@/lib/basecamp/roles';

export const runtime = 'nodejs';

/** Change someone's role, or deactivate/reactivate them. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'users:manage');
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: 'No such person.' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { role?: unknown; active?: unknown };
  const nextRole = body.role === undefined ? undefined : body.role;
  if (nextRole !== undefined && !isRole(nextRole)) {
    return NextResponse.json({ error: 'Choose a valid role.' }, { status: 400 });
  }

  const actor = { id: gate.session.userId ?? 'bootstrap', role: gate.session.role };
  const verdict = canManageUser(actor, target, nextRole as never);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });

  try {
    /* Never leave the platform without a way in. Demoting or deactivating the last
       active owner would lock everyone out of owner-only actions, and the shared
       password may since have been rotated away. */
    const losingOwner =
      target.role === 'owner' && (nextRole !== undefined && nextRole !== 'owner' || body.active === false);
    if (losingOwner && (await countActiveOwners()) <= 1) {
      return NextResponse.json({ error: 'That is the last owner. Promote someone else first.' }, { status: 409 });
    }

    if (nextRole !== undefined) await setUserRole(id, nextRole as never);
    if (typeof body.active === 'boolean') await setUserActive(id, body.active);

    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'user.update',
      target: target.email,
      metadata: { role: nextRole ?? null, active: typeof body.active === 'boolean' ? body.active : null },
    });
    return NextResponse.json({ user: await getUserById(id) });
  } catch (error) {
    console.error('User update failed', error);
    return NextResponse.json({ error: 'Unable to update that person.' }, { status: 500 });
  }
}
