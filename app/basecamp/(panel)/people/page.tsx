import type { Metadata } from 'next';
import { PeopleAdmin } from '@/components/basecamp/PeopleAdmin';

export const metadata: Metadata = {
  title: 'People - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampPeoplePage() {
  return <PeopleAdmin />;
}
