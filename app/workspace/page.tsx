import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LeadWorkspace } from '@/components/workspace/LeadWorkspace';
import { PORTAL_COOKIE, verifyPortalToken } from '@/lib/leads/auth';

export const metadata: Metadata = {
  title: 'Lead Workspace',
  robots: { index: false, follow: false },
};

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  if (!verifyPortalToken(cookieStore.get(PORTAL_COOKIE)?.value)) {
    redirect('/workspace/login');
  }
  return <LeadWorkspace />;
}
