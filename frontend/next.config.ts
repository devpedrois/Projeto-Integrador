import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://peqzo3marpkt7bsh.public.blob.vercel-storage.com",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), fullscreen=()",
          },
        ],
      },
    ];
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

    return [
      { source: "/api/docs/", destination: `${origin.origin}/docs/` },
      { source: "/api/:path*", destination: `${origin.origin}/:path*` },
    ];
  },
};

export default nextConfig;
