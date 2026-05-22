import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = siteConfig.url;

  // Phase 1 sitemap: top-level surviving routes only.
  // Program detail routes (/pricing/[program], /cohorts/[slug], /wins/[slug])
  // are added back in Batch B / Phase 2 once their data sources land.
  const topLevel: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/events`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${base}/legal/earnings-disclaimer`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/legal/refund-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  return topLevel;
}
