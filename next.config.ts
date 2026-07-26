import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // PDF.js loads its worker and native Canvas adapter at runtime. Keeping it
  // external prevents Turbopack from rewriting those dynamic module imports.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
