import { siteConfig, ogImage } from '@/lib/utils';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.legalName,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/ensaar-logo.png`,
    image: ogImage,
    description: siteConfig.description,
    foundingDate: String(siteConfig.foundedYear),
    email: siteConfig.email,
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
      { '@type': 'Country', name: 'India' },
      { '@type': 'Place', name: 'Worldwide' },
    ],
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
      },
    ],
  };
}

export function serviceSchema(params: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: params.name,
    description: params.description,
    url: params.url,
    serviceType: params.serviceType,
    provider: { '@id': `${siteConfig.url}/#organization` },
    areaServed: 'Worldwide',
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { '@id': `${siteConfig.url}/#organization` },
    inLanguage: 'en-IN',
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

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
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

export function webPageSchema(params: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    inLanguage: 'en-IN',
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
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
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    url: params.url,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    image: params.imageUrl ?? `${siteConfig.url}/og-image.png`,
    author: {
      '@type': 'Organization',
      name: params.authorName ?? siteConfig.legalName,
      url: siteConfig.url,
    },
    publisher: { '@id': `${siteConfig.url}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': params.url },
  };
}
