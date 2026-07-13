/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // === API BASE ===
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.cuple.shop/api",

    // === ADMIN API ===
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL || "https://api.cuple.shop/api/admin",

    // === WEBSITE API ===
    NEXT_PUBLIC_WEBSITE_API_URL: process.env.NEXT_PUBLIC_WEBSITE_API_URL || "https://api.cuple.shop/api/website",

    // Server-only fallback for App Router metadata fetch
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://api.cuple.shop/api/website",

    // === STORAGE / IMAGES ===
    storageURL: process.env.storageURL || "https://api.cuple.shop",
    IMAGE_URL: process.env.IMAGE_URL || "https://api.cuple.shop",
  },

  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,

    localPatterns: [{ pathname: "/assets/**" }],

    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "8010", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8010", pathname: "/**" },
      { protocol: "https", hostname: "api.cuple.shop", pathname: "/**" },
      { protocol: "https", hostname: "cuple.ae", pathname: "/**" },
      { protocol: "https", hostname: "*.cuple.ae", pathname: "/**" },
    ],
  },

  poweredByHeader: false,
};

export default nextConfig;
