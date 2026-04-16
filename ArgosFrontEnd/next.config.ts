import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['nuqs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;