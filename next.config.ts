import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    AWS_PROFILE: process.env.AWS_PROFILE,
    FLUID_SERVER_BASE_URL: process.env.FLUID_SERVER_BASE_URL,
    NETWORK: process.env.NETWORK,
    MAESTRO_NETWORK: process.env.MAESTRO_NETWORK,
    MAESTRO_API_KEY: process.env.MAESTRO_API_KEY,
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"]
    });
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };
    return config;
  }
};

export default nextConfig;
