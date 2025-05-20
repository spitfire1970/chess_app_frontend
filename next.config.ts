import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL_DEPLOYED


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
		]
	},
};

export default nextConfig;
