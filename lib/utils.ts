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
    'Ensaar Global is an AI-powered engineering design and technology services company based in Hyderabad, India. We build intelligent solutions, deliver business excellence training, and advance enterprises into the AI era.',
  tagline: 'Technology Meets Design',
  email: 'hr@ensaar.com',
  trainingEmail: 'Trainings@ensaar.com',
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
