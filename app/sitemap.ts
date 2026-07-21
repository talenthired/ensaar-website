import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/utils';
import { BCEP_TRACKS } from '@/lib/content/bcep';
import { INSIGHTS } from '@/lib/content/insights';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = siteConfig.url;

  const topLevel: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${base}/services/ai-solutions`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/services/software-development`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/services/staffing`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/services/corporate-training`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/ai-work-lab`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/events`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/verify`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/insights`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/legal/refund-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const trainingTracks: MetadataRoute.Sitemap = BCEP_TRACKS.map((track) => ({
    url: `${base}/services/corporate-training/${track.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.65,
  }));

  const insights: MetadataRoute.Sitemap = INSIGHTS.map((insight) => ({
    url: `${base}/insights/${insight.slug}`,
    lastModified: new Date(insight.updated),
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  return [...topLevel, ...trainingTracks, ...insights];
}
