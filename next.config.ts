import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@higgsfield/client"],
  images: {
    // Catalog previews and generated assets come from Higgsfield's CDN; the
    // exact hosts aren't pinned by the API contract, so previews render via
    // plain <img>/<video>. next/image is reserved for local files in /public.
    unoptimized: false,
  },
};

export default nextConfig;
