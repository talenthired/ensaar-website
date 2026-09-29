import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { revokeInvitation } from '@/lib/basecamp/invitations';
import { writeAudit } from '@/lib/basecamp/audit';

export const runtime = 'nodejs';

/** Revoke an outstanding invitation. The link stops working immediately. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireBasecamp(request, 'users:invite');
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  try {
    await revokeInvitation(id);
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'invitation.revoke',
      target: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Revoke failed', error);
    return NextResponse.json({ error: 'Unable to revoke that invitation.' }, { status: 500 });
  }
}
