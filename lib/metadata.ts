import type { Metadata } from 'next';
import { siteConfig, ogImageFor } from './utils';

type PageMetaParams = {
  title: string;
  description: string;
  path: string;
  /** Small label rendered above the title on the social card. */
  eyebrow?: string;
  /** Page-specific query terms, merged on top of the site-wide keyword set. */
  keywords?: string[];
  /** Set for editorial pages so Open Graph advertises article metadata. */
  article?: {
    publishedTime: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  /** Parameterized or gated pages that should stay out of the index. */
  noindex?: boolean;
  /** Alternate representations, e.g. an RSS feed for an article index. */
  feeds?: Record<string, string>;
};

export function pageMetadata({
  title,
  description,
  path,
  eyebrow,
  keywords,
  article,
  noindex,
  feeds,
}: PageMetaParams): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = title === siteConfig.name ? title : `${title} - ${siteConfig.name}`;
  const image = ogImageFor({ title, eyebrow });

  return {
    title: { absolute: fullTitle },
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: {
      canonical: url,
      languages: { 'en-IN': url, 'x-default': url },
      ...(feeds ? { types: feeds } : {}),
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: 'en_IN',
      ...(article
        ? {
            type: 'article' as const,
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime ?? article.publishedTime,
            ...(article.section ? { section: article.section } : {}),
            ...(article.tags ? { tags: article.tags } : {}),
            authors: [siteConfig.legalName],
          }
        : { type: 'website' as const }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}
