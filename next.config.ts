import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // title, description and share images always travel inside <head> (never streamed after the page), so
  // every crawler, link preview and audit tool sees them
  htmlLimitedBots: /.*/,
  // photos uploaded from the admin panel and cake previews travel inside Server Actions
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // WASM Postgres used for local development must not be bundled
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 768, 1024, 1440, 1920],
    imageSizes: [96, 160, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
