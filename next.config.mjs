/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rximceyukpiwhyujhokd.supabase.co',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Cache static API data (slugs, initiatives, tags) for 60s on CDN
        source: '/api/(slugs|initiatives|tags|workspaces)',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' },
        ],
      },
    ];
  },
};

export default nextConfig;
