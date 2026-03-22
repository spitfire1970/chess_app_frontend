import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? process.env.API_URL_DEPLOYED
const GPU_URL = process.env.GPU_URL_DEPLOYED

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const rules = [];
    if (API_URL) {
      rules.push({ source: '/api/proxy/:path*', destination: `${API_URL}/:path*` });
    }
    if (GPU_URL) {
      rules.push({ source: '/gpu/proxy', destination: GPU_URL });
      rules.push({ source: '/gpu/proxy/:path*', destination: `${GPU_URL}/:path*` });
    }
    return rules;
  },
};

export default nextConfig;
