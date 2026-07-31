/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90, 95],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'verify.ensaar.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/services/engineering', destination: '/services/ai-solutions', permanent: true },
      { source: '/services/technology', destination: '/services/ai-solutions', permanent: true },
      { source: '/ai', destination: '/services/ai-solutions', permanent: true },
      { source: '/bcep', destination: '/services/corporate-training', permanent: true },
      { source: '/bcep/:track', destination: '/services/corporate-training/:track', permanent: true },
      { source: '/certificate-verification', destination: '/verify', permanent: true },
      // The lead workspace became the Submissions section of Basecamp.
      { source: '/workspace', destination: '/basecamp/leads', permanent: true },
      { source: '/workspace/login', destination: '/basecamp/login', permanent: true },
      { source: '/services/corporate-training/soft-skills', destination: '/services/corporate-training/business-communication', permanent: true },
      { source: '/services/corporate-training/train-the-trainer', destination: '/services/corporate-training/facilitator', permanent: true },
      { source: '/work', destination: '/', permanent: true },
      { source: '/insights/ai-cost-reduction-audit-framework', destination: '/insights/enterprise-ai-adoption-roadmap', permanent: true },
      { source: '/insights/managed-ai-pods-vs-freelancers', destination: '/insights/multi-model-ai-strategy', permanent: true },
      { source: '/insights/ai-augmented-staffing-cost-model', destination: '/insights/ide-native-ai-engineering', permanent: true },
    ];
  },
  async headers() {
    // Content-Security-Policy. 'unsafe-inline' is required for scripts because the
    // theme bootstrap, the JSON-LD blocks, and the GA config are inline, and Next
    // injects its own inline hydration scripts. That weakens the XSS benefit, but
    // the other directives still carry real weight: frame-ancestors blocks
    // clickjacking of Basecamp, form-action stops form hijacking, base-uri stops
    // <base> injection, and object-src kills legacy plugin vectors. Moving to a
    // nonce would need per-request middleware threading through every inline
    // script, so it is deliberately left as a follow-up rather than a half-done
    // nonce that silently breaks the theme script.
    // `next dev` compiles the client bundle with eval-based source maps and
    // React Fast Refresh, both of which need 'unsafe-eval'. Without it the
    // bundle throws before hydrating, so every 'use client' component (the
    // hero, the DailyByte gallery) is frozen in its pre-hydration state and
    // looks broken. Dev only: the production CSP stays strict.
    const devEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${devEval} https://www.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com https://verify.ensaar.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      // Belt-and-braces with frame-ancestors, for older browsers.
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      // HSTS: 2 years, subdomains included. Vercel serves HTTPS only.
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];

    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|woff|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      { source: '/:path*', headers: securityHeaders },
      // Basecamp holds lead PII: never cache it, never let it be indexed.
      {
        source: '/basecamp/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
