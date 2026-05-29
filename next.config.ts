import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Wikipedia and other external sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "*.inaturalist.org",
      },
    ],
  },
  // Allow larger request bodies for audio/video uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
