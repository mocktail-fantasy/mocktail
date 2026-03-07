import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@mocktail/core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.www.nfl.com',
        pathname: '/image/**',
      },
    ],
  },
};

export default nextConfig;
