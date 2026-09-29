import type { Metadata } from 'next';
import { InviteAccept } from '@/components/basecamp/InviteAccept';

export const metadata: Metadata = {
  title: 'Accept invitation - Basecamp',
  robots: { index: false, follow: false },
};

/**
 * Sits outside the (panel) route group on purpose: the invitee has no session
 * yet, and inside the group the auth gate would redirect them to the login page
 * before they could accept.
 */
export default async function BasecampInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-16">
      <div className="container-page mx-auto max-w-lg">
        <InviteAccept token={token} />
      </div>
    </div>
  );
}
