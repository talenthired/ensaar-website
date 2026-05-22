/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      // Routes deleted from HEAD (Next.js commit ee20ffa) - 308 permanent to closest new concept.
      { source: '/services', destination: '/pricing', permanent: true },
      { source: '/services/ai-solutions', destination: '/pricing', permanent: true },
      { source: '/services/engineering', destination: '/pricing', permanent: true },
      { source: '/services/technology', destination: '/pricing', permanent: true },
      { source: '/ai', destination: '/pricing', permanent: true },
      { source: '/bcep', destination: '/pricing', permanent: true },
      { source: '/bcep/leadership', destination: '/pricing', permanent: true },
      { source: '/bcep/soft-skills', destination: '/pricing', permanent: true },
      { source: '/bcep/professional', destination: '/pricing', permanent: true },
      { source: '/bcep/train-the-trainer', destination: '/pricing', permanent: true },
      { source: '/work', destination: '/', permanent: true },
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
