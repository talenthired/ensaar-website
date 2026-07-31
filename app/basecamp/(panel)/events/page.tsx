import type { Metadata } from 'next';
import { EventsAdmin } from '@/components/basecamp/EventsAdmin';

export const metadata: Metadata = {
  title: 'Events - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampEventsPage() {
  return <EventsAdmin />;
}
