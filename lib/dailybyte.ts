/**
 * Where DailyByte lives, and how this site links to it.
 *
 * The host used to be hardcoded in four places with three different values: a
 * redirect fallback pointing at an old subdomain, a "planned product host" line
 * in the llms.txt content, an address bar in the animated product mock, and
 * four invented paths in the screenshot gallery captions. A visitor could be
 * sent to one domain while being shown another.
 *
 * NEXT_PUBLIC_ so the marketing components can render the host in the browser.
 * The redirect route also honours a server-only DAILYBYTE_URL, which wins when
 * set.
 */

/** Fallback, so a missing variable still points at the right product. */
const DEFAULT_DAILYBYTE_URL = 'https://dailybytepro.com';

/** No trailing slash, so `${dailyByteUrl}${path}` never doubles up. */
export const dailyByteUrl: string = (
  process.env.NEXT_PUBLIC_DAILYBYTE_URL?.trim() || DEFAULT_DAILYBYTE_URL
).replace(/\/+$/, '');

/** Hostname only, for the mock browser chrome and the gallery captions. */
export const dailyByteHost: string = (() => {
  try {
    return new URL(dailyByteUrl).host;
  } catch {
    return new URL(DEFAULT_DAILYBYTE_URL).host;
  }
})();

/**
 * Internal tracked links. These stay relative and go through
 * /dailybyte/[destination], which attaches UTM parameters and redirects.
 */
export const dailyByteLinks = {
  home: '/dailybyte/product',
  register: '/dailybyte/register',
  individual: '/dailybyte/individual',
  teams: '/dailybyte/teams',
  enterprise: '/dailybyte/enterprise',
  pricing: '/dailybyte/plans',
} as const;
