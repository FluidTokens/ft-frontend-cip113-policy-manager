import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AWS_PROFILE: process.env.AWS_PROFILE,
    FLUID_SERVER_BASE_URL: process.env.FLUID_SERVER_BASE_URL,
    NETWORK: process.env.NETWORK,
    MAESTRO_NETWORK: process.env.MAESTRO_NETWORK,
    MAESTRO_API_KEY: process.env.MAESTRO_API_KEY,
  }
};

export default nextConfig;
