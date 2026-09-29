import type { Metadata } from 'next';
import { PortalApp } from '@/components/portal/PortalApp';

export const metadata: Metadata = {
  title: 'Client portal - Ensaar',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function PortalPage() {
  return <PortalApp />;
}
