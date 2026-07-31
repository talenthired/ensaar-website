import { siteConfig, ogImage, SITE_LAST_MODIFIED, SITE_PUBLISHED } from '@/lib/utils';
import { SERVICES } from '@/lib/content/services';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.legalName,
    alternateName: siteConfig.name,
    legalName: siteConfig.legalName,
    slogan: siteConfig.tagline,
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: `${siteConfig.url}/ensaar-logo.png`,
      width: 938,
      height: 259,
    },
    image: ogImage,
    description: siteConfig.description,
    foundingDate: String(siteConfig.foundedYear),
    email: siteConfig.email,
    knowsAbout: siteConfig.knowsAbout,
    knowsLanguage: ['en'],
    ...(siteConfig.sameAs.length > 0 ? { sameAs: siteConfig.sameAs } : {}),
    address: siteConfig.locations.map((location) => ({
      '@type': 'PostalAddress',
      addressLocality: location.city,
      addressRegion: location.state,
      addressCountry: siteConfig.countryCode,
    })),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 17.4474,
      longitude: 78.4641,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
    areaServed: [
      ...siteConfig.deliveredIn.map((name) => ({ '@type': 'Country', name })),
      { '@type': 'Place', name: 'Worldwide' },
    ],
    // The service catalogue in machine-readable form. Answer engines lean on this to
    // state what the company actually sells rather than paraphrasing hero copy.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Ensaar Global services',
      itemListElement: SERVICES.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          '@id': `${siteConfig.url}/services/${service.slug}#service`,
          name: service.name,
          description: service.shortDescription,
          serviceType: service.serviceType,
          url: `${siteConfig.url}/services/${service.slug}`,
        },
      })),
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: siteConfig.email,
        contactType: 'customer support',
        areaServed: 'Worldwide',
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        email: siteConfig.trainingEmail,
        contactType: 'corporate training',
        areaServed: 'Worldwide',
        availableLanguage: ['English'],
      },
    ],
  };
}

export function serviceSchema(params: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  offerings?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${params.url}#service`,
    name: params.name,
    description: params.description,
    url: params.url,
    serviceType: params.serviceType,
    provider: { '@id': `${siteConfig.url}/#organization` },
    areaServed: [
      ...siteConfig.deliveredIn.map((name) => ({ '@type': 'Country', name })),
      { '@type': 'Place', name: 'Worldwide' },
    ],
    ...(params.offerings && params.offerings.length > 0
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `${params.name} offerings`,
            itemListElement: params.offerings.map((offering) => ({
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: offering },
            })),
          },
        }
      : {}),
  };
}

/**
 * The full graph for a service detail page: the page node, its breadcrumb trail, and
 * the service itself with its offering catalogue. Every service page needs the same
 * three, so they are built together instead of assembled by hand on each route.
 */
export function serviceDetailSchemas(service: {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  serviceType: string;
  offerings: string[];
}) {
  const url = `${siteConfig.url}/services/${service.slug}`;
  const trail = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Services', url: `${siteConfig.url}/services` },
    { name: service.name, url },
  ];
  return [
    webPageSchema({
      name: service.name,
      description: service.shortDescription,
      url,
      breadcrumb: trail,
    }),
    breadcrumbSchema(trail, url),
    serviceSchema({
      name: service.name,
      description: service.longDescription,
      serviceType: service.serviceType,
      url,
      offerings: service.offerings,
    }),
  ];
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    alternateName: siteConfig.legalName,
    description: siteConfig.description,
    publisher: { '@id': `${siteConfig.url}/#organization` },
    inLanguage: 'en-IN',
    copyrightHolder: { '@id': `${siteConfig.url}/#organization` },
  };
}

/**
 * A ranked list of pages (article index, service index). Gives crawlers and answer
 * engines the collection membership and ordering that a grid of cards does not express.
 */
export function itemListSchema(params: {
  name: string;
  url: string;
  items: Array<{ name: string; url: string; description?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: params.name,
    url: params.url,
    numberOfItems: params.items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: params.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: item.url,
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function softwareApplicationSchema(params: {
  name: string;
  description: string;
  url: string;
  featureList: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.name,
    description: params.description,
    url: params.url,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    featureList: params.featureList,
    creator: { '@id': `${siteConfig.url}/#organization` },
    inLanguage: 'en',
  };
}

/**
 * `pageUrl` links the trail back to the WebPage node via `@id`, so the two graph
 * fragments on a page resolve to each other instead of floating independently.
 */
export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>,
  pageUrl?: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    ...(pageUrl ? { '@id': `${pageUrl}#breadcrumb` } : {}),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPageSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

type WebPageType =
  | 'WebPage'
  | 'AboutPage'
  | 'ContactPage'
  | 'CollectionPage'
  | 'FAQPage'
  | 'CheckoutPage'
  | 'ProfilePage';

export function webPageSchema(params: {
  name: string;
  description: string;
  url: string;
  type?: WebPageType;
  datePublished?: string;
  dateModified?: string;
  /** Breadcrumb trail, so the page node and the BreadcrumbList resolve to each other. */
  breadcrumb?: Array<{ name: string; url: string }>;
  /** Short quotable summary. Answer engines prefer an explicit abstract over guessing. */
  about?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': params.type ?? 'WebPage',
    '@id': `${params.url}#webpage`,
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    about: { '@id': `${siteConfig.url}/#organization` },
    ...(params.about && params.about.length > 0
      ? { mentions: params.about.map((name) => ({ '@type': 'Thing', name })) }
      : {}),
    ...(params.breadcrumb && params.breadcrumb.length > 0
      ? { breadcrumb: { '@id': `${params.url}#breadcrumb` } }
      : {}),
    primaryImageOfPage: { '@type': 'ImageObject', url: ogImage },
    inLanguage: 'en-IN',
    datePublished: params.datePublished ?? SITE_PUBLISHED,
    dateModified: params.dateModified ?? SITE_LAST_MODIFIED,
  };
}

export function productSchema(params: {
  name: string;
  description: string;
  url: string;
  priceUsd: number;
  priceSuffix?: string;
  aggregate?: boolean;
}) {
  const offer = params.aggregate
    ? {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: String(params.priceUsd),
        offerCount: 3,
        availability: 'https://schema.org/InStock',
        url: params.url,
      }
    : {
        '@type': 'Offer',
        price: String(params.priceUsd),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: params.url,
      };
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.name,
    description: params.description,
    url: params.url,
    brand: { '@id': `${siteConfig.url}/#organization` },
    offers: offer,
  };
}

export function courseSchema(params: {
  name: string;
  description: string;
  url: string;
  priceUsd: number;
  priceInr?: number;
  courseCode?: string;
  startDate?: string;
  endDate?: string;
  instructorName?: string;
}) {
  const offers = [
    {
      '@type': 'Offer',
      price: String(params.priceUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: params.url,
    },
    ...(params.priceInr != null
      ? [
          {
            '@type': 'Offer',
            price: String(params.priceInr),
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: params.url,
          },
        ]
      : []),
  ];

  const courseInstance =
    params.startDate || params.instructorName
      ? {
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'Online',
            ...(params.startDate ? { startDate: params.startDate } : {}),
            ...(params.endDate ? { endDate: params.endDate } : {}),
            ...(params.instructorName
              ? {
                  instructor: {
                    '@type': 'Person',
                    name: params.instructorName,
                  },
                }
              : {}),
          },
        }
      : {};

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: params.name,
    description: params.description,
    url: params.url,
    provider: { '@id': `${siteConfig.url}/#organization` },
    ...(params.courseCode ? { courseCode: params.courseCode } : {}),
    ...courseInstance,
    offers,
  };
}

export function eventSchema(params: {
  name: string;
  description: string;
  url: string;
  startDate: string;
  endDate?: string;
  eventStatus?:
    | 'EventScheduled'
    | 'EventCancelled'
    | 'EventPostponed'
    | 'EventRescheduled'
    | 'EventMovedOnline';
  eventAttendanceMode?:
    | 'OfflineEventAttendanceMode'
    | 'OnlineEventAttendanceMode'
    | 'MixedEventAttendanceMode';
  locationName?: string;
  isOnline?: boolean;
}) {
  const location = params.isOnline
    ? {
        '@type': 'VirtualLocation',
        url: params.url,
      }
    : {
        '@type': 'Place',
        name: params.locationName ?? 'Ensaar Global, Hyderabad',
        address: {
          '@type': 'PostalAddress',
          addressLocality: siteConfig.locality,
          addressRegion: siteConfig.region,
          addressCountry: siteConfig.countryCode,
        },
      };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: params.name,
    description: params.description,
    url: params.url,
    startDate: params.startDate,
    ...(params.endDate ? { endDate: params.endDate } : {}),
    eventStatus: `https://schema.org/${params.eventStatus ?? 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${params.eventAttendanceMode ?? (params.isOnline ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode')}`,
    location,
    organizer: { '@id': `${siteConfig.url}/#organization` },
  };
}

export function personSchema(params: {
  name: string;
  jobTitle?: string;
  image?: string;
  sameAs?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: params.name,
    ...(params.jobTitle ? { jobTitle: params.jobTitle } : {}),
    ...(params.image ? { image: params.image } : {}),
    ...(params.sameAs && params.sameAs.length > 0 ? { sameAs: params.sameAs } : {}),
    worksFor: { '@id': `${siteConfig.url}/#organization` },
  };
}

export function howToSchema(params: {
  name: string;
  description: string;
  url: string;
  steps: Array<{ name: string; text: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    description: params.description,
    url: params.url,
    step: params.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function articleSchema(params: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  imageUrl?: string;
  authorName?: string;
  articleSection?: string;
  keywords?: string[];
  wordCount?: number;
  /** Bullet abstract. Answer engines quote this ahead of reconstructing the body. */
  abstract?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${params.url}#article`,
    headline: params.title.slice(0, 110),
    name: params.title,
    description: params.description,
    url: params.url,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    image: params.imageUrl ?? ogImage,
    ...(params.articleSection ? { articleSection: params.articleSection } : {}),
    ...(params.keywords && params.keywords.length > 0 ? { keywords: params.keywords } : {}),
    ...(params.wordCount ? { wordCount: params.wordCount } : {}),
    ...(params.abstract && params.abstract.length > 0
      ? { abstract: params.abstract.join(' ') }
      : {}),
    inLanguage: 'en-IN',
    isAccessibleForFree: true,
    author: {
      '@type': 'Organization',
      '@id': `${siteConfig.url}/#organization`,
      name: params.authorName ?? siteConfig.legalName,
      url: siteConfig.url,
    },
    publisher: { '@id': `${siteConfig.url}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${params.url}#webpage` },
  };
}
