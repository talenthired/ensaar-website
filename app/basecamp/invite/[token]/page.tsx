import type { Metadata } from 'next';
import { BasecampBar } from '@/components/basecamp/BasecampNav';
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
    <div className="min-h-screen bg-bg-secondary pb-16">
      <BasecampBar />
      <div className="container-page mx-auto max-w-lg pt-12">
        <InviteAccept token={token} />
      </div>
    </div>
  );
}
