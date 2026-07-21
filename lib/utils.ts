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
    'Ensaar Global helps enterprises turn valuable workflows into controlled AI pilots and helps students, engineers, teams, and campuses build practical AI capability through realistic work, software engineering, secure deployment, and governance.',
  tagline: 'AI that works. People ready to use it.',
  taglineLong: 'Enterprise AI implementation, practical workforce enablement, software engineering, secure deployment, BCEP AI readiness, and measurable AI capability.',
  email: 'info@ensaar.com',
  trainingEmail: 'info@ensaar.com',
  refundUrl: '/legal/refund-policy',
  locality: 'Hyderabad',
  region: 'Telangana',
  state: 'Telangana',
  country: 'India',
  countryCode: 'IN',
  foundedYear: 2014,
  hours: 'Mo-Fr 09:00-17:00',
  locales: ['en-IN', 'en'],
  locations: [
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'Noida', state: 'Uttar Pradesh' },
  ],
} as const;

export const ogImage = `${siteConfig.url}/og`;
