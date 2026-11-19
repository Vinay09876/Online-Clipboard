import type { NextConfig } from "next";

/**
 * Security headers for every response (pages and API).
 * No Content-Security-Policy yet: it will be added in Step 7, once the UI exists.
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
      // Belt and braces: route handlers already set this on every response.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
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
