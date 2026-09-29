import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable compression
  compress: true,
  // React strict mode
  reactStrictMode: true,
  // Performance optimizations
  poweredByHeader: false,
  // Personalised client demos are rendered by the W3Tech Sales Engine (Flask).
  // When DEMO_ENGINE_URL is set, /demo/* and /demo-assets/* are proxied to it;
  // beforeFiles so they win over the [...slug] catch-all route.
  async rewrites() {
    const engine = process.env.DEMO_ENGINE_URL?.replace(/\/$/, "");
    return {
      beforeFiles: [
        // Static template showcases in public/demos: clean URLs -> index.html
        { source: "/demos/:group([a-z0-9-]+)", destination: "/demos/:group/index.html" },
        { source: "/demos/:group([a-z0-9-]+)/:variant([a-z0-9-]+)", destination: "/demos/:group/:variant/index.html" },
        ...(engine
          ? [
              { source: "/demo/:path*", destination: `${engine}/demo/:path*` },
              { source: "/demo-assets/:path*", destination: `${engine}/demo-assets/:path*` },
            ]
          : []),
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      // Old URL kept for backward compatibility
      {
        source: "/terms-and-conditions",
        destination: "/terms-of-service",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
