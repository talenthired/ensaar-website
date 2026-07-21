import type { Metadata } from 'next';
import { siteConfig, ogImage } from './utils';

type PageMetaParams = {
  title: string;
  description: string;
  path: string;
};

export function pageMetadata({ title, description, path }: PageMetaParams): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = title === siteConfig.name ? title : `${title} - ${siteConfig.name}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteConfig.name }],
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
