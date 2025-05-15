import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // ⚠️ Warning: This makes builds fail when TypeScript errors are present
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
