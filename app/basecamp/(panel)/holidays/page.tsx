import type { Metadata } from 'next';
import { HolidayCalendar } from '@/components/basecamp/HolidayCalendar';

export const metadata: Metadata = {
  title: 'Holiday calendar - Basecamp',
  robots: { index: false, follow: false },
};

export default function BasecampHolidaysPage() {
  return <HolidayCalendar />;
}
