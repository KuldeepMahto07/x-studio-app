import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Dev only: also serve the dev server to 127.0.0.1, phones on the local network,
  // and Cloudflare quick tunnels (used to receive Lemon Squeezy webhooks while testing).
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "*.trycloudflare.com"],
  // Accept form submissions from the tunnel address in development only. Never in production:
  // anyone can create a trycloudflare.com address, so allowing it there would weaken CSRF protection.
  ...(isDev ? { experimental: { serverActions: { allowedOrigins: ["*.trycloudflare.com"] } } } : {}),
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
