import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" removed — not compatible with Vercel/hosted deployment
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["21.0.6.70"],
  // Ensure db/ folder is included in serverless bundles
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
