import type { Metadata } from 'next';
import { TeamApp } from '@/components/team/TeamApp';

export const metadata: Metadata = {
  title: 'Employee portal - Ensaar',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function TeamPage() {
  return <TeamApp />;
}
