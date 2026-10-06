import type { NextConfig } from "next";

const apiUrl = process.env.HOSPITAL_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: apiUrl + "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
