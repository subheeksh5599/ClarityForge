import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force webpack bundler for compatibility with @stacks/connect
  turbopack: {
    // empty — webpack used for builds when turbopack config is absent or minimal
  },
};

export default nextConfig;
