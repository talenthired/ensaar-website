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
  // Verified public profiles for the company. Emitted as schema.org sameAs, which is
  // how search engines and answer engines tie this site to the same real-world entity.
  // Add the live profile URLs here; anything empty is omitted from the markup.
  sameAs: [] as string[],
  // Topics the organization is an authority on. Emitted as Organization.knowsAbout and
  // used by answer engines when deciding which entity a question belongs to.
  knowsAbout: [
    'Enterprise AI implementation',
    'AI workflow discovery and pilot design',
    'Multi-model AI strategy',
    'Retrieval-augmented generation',
    'Amazon Bedrock and AWS GPU deployment',
    'AI observability, evaluation, and governance',
    'IDE-native AI engineering workflows',
    'Custom software and product engineering',
    'AI-ready engineering teams and staffing',
    'Practical AI workforce enablement',
    'AI skills assessment and capability pilots',
    'BCEP AI readiness certification',
    'Business communication and emotional intelligence training',
  ] as string[],
  // Countries where delivery work has been completed. Used for areaServed.
  deliveredIn: ['India', 'Singapore', 'China', 'United Arab Emirates', 'Saudi Arabia', 'Japan', 'Australia'] as string[],
} as const;

/**
 * Last substantive content revision, in ISO date form. Structured data uses this
 * instead of `new Date()` so `dateModified` stays stable between builds - a value
 * that moves on every deploy tells crawlers nothing and erodes trust in the signal.
 */
export const SITE_LAST_MODIFIED = '2026-07-23';

/** Date the site first published, used as the default `datePublished`. */
export const SITE_PUBLISHED = '2024-01-01';

export const ogImage = `${siteConfig.url}/og`;

/**
 * Per-page social card. The /og route renders the passed copy, so each page gets a
 * distinct share image instead of every URL reusing the site-wide default.
 */
export function ogImageFor({ title, eyebrow }: { title?: string; eyebrow?: string }) {
  const params = new URLSearchParams();
  if (title) params.set('title', title.slice(0, 110));
  if (eyebrow) params.set('eyebrow', eyebrow.slice(0, 42));
  const query = params.toString();
  return query ? `${ogImage}?${query}` : ogImage;
}
