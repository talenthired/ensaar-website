import type { Metadata } from 'next';
import { ClientDetail } from '@/components/basecamp/ClientDetail';

export const metadata: Metadata = {
  title: 'Client - Basecamp',
  robots: { index: false, follow: false },
};

export default async function BasecampClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
