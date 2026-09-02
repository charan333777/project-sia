import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@sia/shared", "@sia/validation"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/nearby", headers: [{ key: "Permissions-Policy", value: "geolocation=(self)" }] }];
  },
};

export default nextConfig;
