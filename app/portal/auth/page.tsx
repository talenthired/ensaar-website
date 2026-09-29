import type { Metadata } from 'next';
import { PortalAuth } from '@/components/portal/PortalChrome';

export const metadata: Metadata = {
  title: 'Signing in - Ensaar',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/** The landing page for a one-time sign-in link (/portal/auth#token). */
export default function PortalAuthPage() {
  return <PortalAuth />;
}
