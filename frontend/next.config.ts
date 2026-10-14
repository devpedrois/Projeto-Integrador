import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL?.trim();
    if (!backendUrl) {
      return [];
    }

    const invalidOrigin =
      "BACKEND_URL inválida: informe uma origem HTTP ou HTTPS.";
    let origin: URL;
    try {
      origin = new URL(backendUrl);
    } catch {
      throw new Error(invalidOrigin);
    }
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    ) {
      throw new Error(invalidOrigin);
    }

    return [{ source: "/api/:path*", destination: `${origin.origin}/:path*` }];
  },
};

export default nextConfig;
