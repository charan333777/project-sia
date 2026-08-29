import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@sia/shared", "@sia/validation"],
  poweredByHeader: false,
};

export default nextConfig;
