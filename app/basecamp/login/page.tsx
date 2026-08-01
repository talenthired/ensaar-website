import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BasecampLogin } from '@/components/basecamp/BasecampLogin';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';

export const metadata: Metadata = {
  title: 'Basecamp sign in',
  robots: { index: false, follow: false },
};

export default async function BasecampLoginPage() {
  // Already signed in: skip the form rather than asking for a password twice.
  const cookieStore = await cookies();
  if (await verifyBasecampToken(cookieStore.get(BASECAMP_COOKIE)?.value)) redirect('/basecamp');
  return <BasecampLogin />;
}
