import type { NextConfig } from "next";

/**
 * Tazdeed School — Next.js configuration.
 *
 * The production target is a **static export** deployed to Firebase Hosting
 * (Spark plan). Static export is toggled with an environment variable so the
 * same repository can also run in the sandbox preview harness (which needs a
 * Node server for `/api/health`).
 *
 *   NEXT_STATIC_EXPORT=1 npm run build   ->  emits `out/` for Firebase Hosting
 *   npm run build                        ->  normal Next.js build (preview/dev)
 *
 * There are no server-side runtime dependencies: every application route is a
 * client component that talks to Firebase Authentication + Cloud Firestore
 * directly from the browser, so direct navigation and refresh work on a static
 * host. No dynamic route segments are used (detail views use query strings),
 * which keeps `output: "export"` valid.
 */
const staticExport =
  process.env.NEXT_STATIC_EXPORT === "1" || process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  ...(staticExport ? { output: "export" as const } : {}),
};

export default nextConfig;
