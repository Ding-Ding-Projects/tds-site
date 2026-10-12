import type { NextConfig } from "next";

const staticPages = process.env.TDS_BUILD_TARGET === "pages";

const nextConfig: NextConfig = {
  ...(staticPages ? { output: "export" } : {}),
  env: {
    NEXT_PUBLIC_SITE_BASE_PATH: staticPages ? "/tds-site" : "",
    NEXT_PUBLIC_STATIC_EXPORT: staticPages ? "true" : "false",
    NEXT_PUBLIC_BUILD_AT: new Date().toISOString(),
    NEXT_PUBLIC_SOURCE_SHA: process.env.GITHUB_SHA ?? process.env.SOURCE_COMMIT ?? "unavailable",
  },
};

export default nextConfig;
