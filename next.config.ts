import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ERP_BUILD_DIR || ".next",
  serverExternalPackages: ["isomorphic-dompurify"],
};

export default nextConfig;
