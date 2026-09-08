import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
};

export default nextConfig;