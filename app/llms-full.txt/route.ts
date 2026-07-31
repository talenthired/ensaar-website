import { buildLlmsFullTxt } from '@/lib/content/llms';

// The expanded corpus: service detail, certification modules, case studies, the full
// FAQ, and complete article bodies in one plain-text document.
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
