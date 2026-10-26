import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: also serve the dev server to 127.0.0.1 and phones on the local network.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
