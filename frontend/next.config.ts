import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js doesn't get confused
  // by an unrelated package-lock.json elsewhere in the user's home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
