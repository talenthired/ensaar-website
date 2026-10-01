import type { Metadata } from 'next';
import { TeamAuth } from '@/components/team/TeamApp';

export const metadata: Metadata = {
  title: 'Signing in - Ensaar',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/** The landing page for a one-time sign-in link (/team/auth#token). */
export default function TeamAuthPage() {
  return <TeamAuth />;
}
