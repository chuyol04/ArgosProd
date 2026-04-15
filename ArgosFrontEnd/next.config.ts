import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['nuqs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;