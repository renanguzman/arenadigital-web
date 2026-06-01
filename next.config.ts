import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-b3be5503931e45b18032c9fe87b9d309.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          // Cache videos for 1 year on CDN; browsers revalidate after 1 day
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=31536000, stale-while-revalidate" },
          // Required for video seeking (range requests)
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
    ];
  },
};

export default nextConfig;
