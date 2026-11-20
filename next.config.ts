import type { NextConfig } from "next";

/**
 * Security headers for every response (pages and API).
 * Page CSP (with a per-request nonce) is set in proxy.ts; API CSP is set below.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      // (no "browsing-topics": current Chrome no longer recognises it and logs a console warning)
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "fullscreen=(self)",
      "clipboard-write=(self)",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // drop "X-Powered-By: Next.js"
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [
          // Belt and braces: route handlers already set this on every response.
          { key: "Cache-Control", value: "no-store" },
          // API responses are JSON, never pages: allow nothing. (Pages get a nonce-based CSP from proxy.ts.)
          { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" },
          // The JSON API should never appear in search results, whatever the host.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
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
