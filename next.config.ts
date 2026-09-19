import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Bet slip screenshots (especially a batch from a phone) can be a
      // few MB each; the 1mb default is too small for that upload path.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
