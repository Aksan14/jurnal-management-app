import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },
};

export default nextConfig;
