import type { Metadata } from 'next';
import { LeaveAdmin } from '@/components/basecamp/LeaveAdmin';

export const metadata: Metadata = {
  title: 'Leave - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampLeavePage() {
  return <LeaveAdmin />;
}
