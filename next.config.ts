import type { NextConfig } from "next";

// iPhone HEIC decoding runs the libheif (emscripten) module in a Web Worker,
// whose bootstrap glue uses eval/new Function - so 'unsafe-eval' is required for
// the core HEIC feature. This is a client-only tool with no secrets, auth, or
// HTML-injection surface, so the trade is acceptable. React dev tooling also
// needs it. 'wasm-unsafe-eval' is kept for browsers that honor the narrower one.
const scriptSrc = "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' blob:",
      // heic2any decodes iPhone HEIC in a blob: Web Worker
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
