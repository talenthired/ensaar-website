import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const siteConfig = {
  name: 'Ensaar Global',
  // As on the GST registration certificate (Form GST REG-06, issued 5 August 2019).
  legalName: 'Ensaar Global Private Limited',
  /** Corporate Identity Number: shown wherever Ensaar identifies itself (Companies Act, s.12). */
  cin: 'U74900TG2016PTC103814',
  /** Where employees write to Ensaar, and what they hear from. */
  hrEmail: 'hr@ensaar.com',
  /** GST registration: on invoices only, where GST law requires it. */
  gstin: '36AAECE2158G1ZS',
  /** Principal place of business, as registered for GST. */
  address: {
    street: 'Second Floor, H.No 16-11-20/G/204, Bhavani Apartments, Saleem Nagar, Malakpet',
    city: 'Hyderabad',
    region: 'Telangana',
    postalCode: '500036',
    country: 'India',
  },
  url: 'https://ensaar.com',
  description:
    'Ensaar Global helps companies outside India build teams inside it. Hire through our Employer of Record without setting up a company, grow that team into your own capability centre, and use the same people for software engineering and practical AI work. Operating from Hyderabad and Noida since 2014.',
  tagline: 'Your team in India, employed properly.',
  taglineLong: 'Employer of Record in India, capability centre setup, software engineering, and practical AI enablement through DailyByte and BCEP.',
  email: 'support@ensaar.com',
  trainingEmail: 'support@ensaar.com',
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
    'Employer of Record in India',
    'India payroll and statutory compliance',
    'Provident fund, ESI, gratuity, and professional tax',
    'Permanent establishment risk for foreign employers in India',
    'Global capability centre setup in India',
    'Indian subsidiary incorporation and FDI filings',
    'Captive centre transfer pricing and safe harbour',
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
export const SITE_LAST_MODIFIED = '2026-09-23';

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
