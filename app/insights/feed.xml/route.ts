import { INSIGHTS } from '@/lib/content/insights';
import { siteConfig } from '@/lib/utils';

// RSS 2.0 feed for the insights library. Feeds remain one of the cheapest ways for
// aggregators, newsreaders, and retrieval crawlers to discover new articles without
// re-crawling the whole site.
export const dynamic = 'force-static';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET(): Response {
  const url = siteConfig.url;
  const sorted = [...INSIGHTS].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
  );
  const lastBuild = sorted[0]
    ? new Date(`${sorted[0].updated}T00:00:00Z`).toUTCString()
    : new Date(0).toUTCString();

  const items = sorted
    .map((insight) => {
      const link = `${url}/insights/${insight.slug}`;
      return `    <item>
      <title>${escapeXml(insight.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(`${insight.published}T00:00:00Z`).toUTCString()}</pubDate>
      <category>${escapeXml(insight.category)}</category>
      <description>${escapeXml(insight.description)}</description>
      <content:encoded><![CDATA[${insight.summary.map((point) => `<p>${point}</p>`).join('')}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(`${siteConfig.name} Insights`)}</title>
    <link>${url}/insights</link>
    <description>${escapeXml('Practical guidance on enterprise AI adoption, model strategy, AI-assisted engineering, and workforce capability.')}</description>
    <language>en-IN</language>
    <copyright>${escapeXml(siteConfig.legalName)}</copyright>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${url}/insights/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
