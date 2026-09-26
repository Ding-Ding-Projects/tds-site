import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_AT: new Date().toISOString(),
    NEXT_PUBLIC_SOURCE_SHA: process.env.GITHUB_SHA ?? process.env.SOURCE_COMMIT ?? "unavailable",
  },
};

export default nextConfig;
