import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL_DEPLOYED
const GPU_URL = process.env.NEXT_PUBLIC_GPU_URL_DEPLOYED

const nextConfig: NextConfig = {
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
