import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Fix cross-origin access for development
  allowedDevOrigins: [
    '10.15.1.38',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
