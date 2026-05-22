import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const siteConfig = {
  name: 'Ensaar Global',
  legalName: 'Ensaar Global Pvt. Ltd.',
  url: 'https://ensaar.com',
  description:
    'Ensaar Global teaches you to build a profitable AI business — through a paid community, live cohort programs, and 1:1 coaching. Operator-led: ten years building production AI for companies across seven countries.',
  tagline: 'Become an AI millionaire.',
  taglineLong: 'Three paths — community, cohorts, 1:1 coaching — to build a profitable AI business.',
  email: 'hr@ensaar.com',
  // Admissions / applications inbox (relabeled in UI from prior "training enquiries" usage).
  trainingEmail: 'Trainings@ensaar.com',
  disclaimerUrl: '/legal/earnings-disclaimer',
  refundUrl: '/legal/refund-policy',
  locality: 'Begumpet',
  region: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  countryCode: 'IN',
  foundedYear: 2014,
  hours: 'Mo-Fr 09:00-17:00',
  locales: ['en-IN', 'en'],
} as const;

export const ogImage = `${siteConfig.url}/og-image.png`;
