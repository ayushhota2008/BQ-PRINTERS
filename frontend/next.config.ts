import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const internalApi = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${internalApi.replace(/\/+$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
