import { NextRequest, NextResponse } from 'next/server';
import { requireBasecamp } from '@/lib/basecamp/guard';
import { listUsers, getUserByEmail } from '@/lib/basecamp/users';
import { createInvitation, listInvitations } from '@/lib/basecamp/invitations';
import { sendInvitationEmail } from '@/lib/basecamp/invite-email';
import { writeAudit } from '@/lib/basecamp/audit';
import { isRole } from '@/lib/basecamp/roles';
import { siteConfig } from '@/lib/utils';

export const runtime = 'nodejs';

/** Everyone who can sign in, plus outstanding invitations. */
export async function GET(request: NextRequest) {
  const gate = await requireBasecamp(request, 'users:read');
  if (!gate.ok) return gate.response;
  try {
    const [users, invitations] = await Promise.all([listUsers(), listInvitations()]);
    return NextResponse.json({ users, invitations, viewer: gate.session });
  } catch (error) {
    console.error('User list failed', error);
    return NextResponse.json({ error: 'Unable to load people.' }, { status: 500 });
  }
}

/** Invite someone by email. */
export async function POST(request: NextRequest) {
  const gate = await requireBasecamp(request, 'users:invite');
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; role?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!isRole(role)) return NextResponse.json({ error: 'Choose a valid role.' }, { status: 400 });
  // Only an owner may create another owner, mirroring canManageUser.
  if (role === 'owner' && gate.session.role !== 'owner') {
    return NextResponse.json({ error: 'Only an owner can invite an owner.' }, { status: 403 });
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: 'That person already has an account.' }, { status: 409 });
  }

  try {
    const { invitation, token } = await createInvitation({
      email,
      role,
      invitedBy: gate.session.userId,
    });
    const link = `${siteConfig.url.replace(/\/+$/, '')}/basecamp/invite/${token}`;
    const emailed = await sendInvitationEmail({
      to: email,
      link,
      role,
      invitedBy: gate.session.email,
    });
    await writeAudit({
      actorId: gate.session.userId,
      actorEmail: gate.session.email,
      action: 'user.invite',
      target: email,
      metadata: { role, emailed },
    });
    // The link is returned once so it can be copied when email is not configured
    // or delivery failed; it is never stored or shown again.
    return NextResponse.json({ invitation, link, emailed }, { status: 201 });
  } catch (error) {
    console.error('Invite failed', error);
    const message = error instanceof Error && /DATABASE_URL/.test(error.message)
      ? 'Basecamp needs a database before people can be invited.'
      : 'Unable to send that invitation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
