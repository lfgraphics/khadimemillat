import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle @zxing/browser which has browser-specific dependencies
    if (isServer) {
      config.externals = [...(config.externals || []), '@zxing/browser']
    }
    return config
  },
};

export default nextConfig;
