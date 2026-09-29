import type { Metadata } from 'next';
import { ClientsAdmin } from '@/components/basecamp/ClientsAdmin';

export const metadata: Metadata = {
  title: 'Clients - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampClientsPage() {
  return <ClientsAdmin />;
}
