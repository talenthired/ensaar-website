import type { Metadata } from 'next';
import { LeadsAdmin } from '@/components/basecamp/LeadsAdmin';

export const metadata: Metadata = {
  title: 'Contact submissions - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampLeadsPage() {
  return <LeadsAdmin />;
}
