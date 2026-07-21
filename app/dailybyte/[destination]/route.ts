import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DESTINATIONS = {
  product: { path: '/', content: 'product-page' },
  register: { path: '/signin?callbackUrl=%2Fpricing', content: 'individual-trial' },
  individual: { path: '/signin?callbackUrl=%2Fpricing', content: 'individual-ai-learn-target' },
  teams: { path: '/signin?callbackUrl=%2Fteam', content: 'team-registration' },
  enterprise: { path: '/signin?callbackUrl=%2Fteam', content: 'enterprise-ai-enablement' },
  plans: { path: '/pricing', content: 'plans' },
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ destination: string }> },
) {
  const { destination } = await context.params;
  const target = DESTINATIONS[destination as keyof typeof DESTINATIONS];
  if (!target) return NextResponse.redirect(new URL('/ai-work-lab', request.url));

  const base = (
    process.env.DAILYBYTE_URL ||
    process.env.NEXT_PUBLIC_DAILYBYTE_URL ||
    'https://dailybyte.ensaar.com'
  ).replace(/\/+$/, '');
  const url = new URL(`${base}${target.path}`);
  url.searchParams.set('utm_source', 'ensaar');
  url.searchParams.set('utm_medium', 'website');
  url.searchParams.set('utm_campaign', 'ai_enablement');
  url.searchParams.set('utm_content', target.content);

  return NextResponse.redirect(url, 307);
}
