import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BasecampNav } from '@/components/basecamp/BasecampNav';
import { BASECAMP_COOKIE, verifyBasecampToken } from '@/lib/basecamp/auth';

/**
 * Single auth gate for every Basecamp section. The login page sits outside this route
 * group on purpose - inside it, the redirect would loop.
 */
export default async function BasecampPanelLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!verifyBasecampToken(cookieStore.get(BASECAMP_COOKIE)?.value)) redirect('/basecamp/login');

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-16">
      <div className="container-page">
        <BasecampNav />
        {children}
      </div>
    </div>
  );
}
