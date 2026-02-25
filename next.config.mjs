/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'archiver'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rximceyukpiwhyujhokd.supabase.co',
      },
    ],
  },
};

export default nextConfig;
