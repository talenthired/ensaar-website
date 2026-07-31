import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/utils';

const DISALLOW = ['/api/', '/basecamp/', '/basecamp'];

/**
 * Crawlers we explicitly welcome, grouped by what they do. Naming them individually
 * is what makes the welcome legible: several of these read only their own directive
 * block and ignore the wildcard one.
 */
const AI_CRAWLERS = [
  // Training and index builders
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'Meta-ExternalAgent',
  'FacebookBot',
  'cohere-ai',
  'Diffbot',
  'omgili',
  'Timpibot',
  // Answer-engine retrieval and live citation fetchers
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  'MistralAI-User',
  'YouBot',
  'Meta-ExternalFetcher',
  'Applebot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      // Each AI crawler repeats the disallow list: a bot matching its own block stops
      // reading the wildcard block, so omitting it would expose /api and /basecamp.
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
