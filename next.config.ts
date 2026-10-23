import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run dev` only: let a phone/iPad on the same Wi-Fi open the dashboard (e.g. http://10.93.43.145:3000)
  // with its buttons working. The PC's address changes, so allow the usual home-network ranges.
  allowedDevOrigins: ['10.*.*.*', '192.168.*.*', '172.*.*.*', '10.93.43.145'],
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
  // Template showcases in public/demos: clean URLs -> index.html.
  // (Personalised client demos live at /demo/[slug], served from the Google Sheet.)
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/demos/:group([a-z0-9-]+)", destination: "/demos/:group/index.html" },
        { source: "/demos/:group([a-z0-9-]+)/:variant([a-z0-9-]+)", destination: "/demos/:group/:variant/index.html" },
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
