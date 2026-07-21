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
      { source: '/services/corporate-training/soft-skills', destination: '/services/corporate-training/business-communication', permanent: true },
      { source: '/services/corporate-training/train-the-trainer', destination: '/services/corporate-training/facilitator', permanent: true },
      { source: '/work', destination: '/', permanent: true },
      { source: '/insights/ai-cost-reduction-audit-framework', destination: '/insights/enterprise-ai-adoption-roadmap', permanent: true },
      { source: '/insights/managed-ai-pods-vs-freelancers', destination: '/insights/multi-model-ai-strategy', permanent: true },
      { source: '/insights/ai-augmented-staffing-cost-model', destination: '/insights/ide-native-ai-engineering', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|woff|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
