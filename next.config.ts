import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["21.0.6.70"],
  serverExternalPackages: ["pg", "@prisma/client"],
  // Security: limit request body size (1MB default, 10MB for file uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
