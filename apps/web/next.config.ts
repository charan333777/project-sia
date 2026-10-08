import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/u/*/opengraph-image": ["./public/mascots/**/*"],
  },
  transpilePackages: ["@sia/shared", "@sia/validation"],
  poweredByHeader: false,
  async headers() {
    const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
    const authOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321").origin;
    const policy = [
      "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${apiOrigin} ${authOrigin}`,
      `img-src 'self' data: blob: ${authOrigin}`, "font-src 'self' data:",
      "form-action 'self'", "frame-src 'none'",
    ].join("; ");
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=()" },
      // Observe compatibility first; enforcing this requires a nonce strategy for Next scripts.
      ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy-Report-Only", value: policy }] : []),
    ] }];
  },
};

export default nextConfig;
