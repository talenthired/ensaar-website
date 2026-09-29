import type { Metadata } from 'next';
import { RegistrationsAdmin } from '@/components/basecamp/RegistrationsAdmin';

export const metadata: Metadata = {
  title: 'Registrations - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampRegistrationsPage() {
  return <RegistrationsAdmin />;
}
