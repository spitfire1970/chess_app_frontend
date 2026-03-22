import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? process.env.API_URL_DEPLOYED
const GPU_URL = process.env.GPU_URL_DEPLOYED

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
	async rewrites() {
		return [
			{
				source: '/api/proxy/:path*',
				destination: `${API_URL}/:path*`,
			},
    {
      source: '/gpu/proxy',
      destination: `${GPU_URL}`, // <-- for root
    },
    {
      source: '/gpu/proxy/:path*',
      destination: `${GPU_URL}/:path*`, // <-- for paths
    }
		]
	},
};

export default nextConfig;
