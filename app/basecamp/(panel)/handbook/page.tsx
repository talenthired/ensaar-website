import type { Metadata } from 'next';
import { HandbookAdmin } from '@/components/basecamp/HandbookAdmin';

export const metadata: Metadata = {
  title: 'Employee Handbook - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampHandbookPage() {
  return <HandbookAdmin />;
}
