import { buildLlmsTxt } from '@/lib/content/llms';

// Generated at build time from the same content modules the pages render, so the
// brief cannot drift from the site. Replaces the former static public/llms.txt.
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
