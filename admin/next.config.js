/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  // Keep dev and prod build outputs separate to avoid manifest races
  // when a dev server and production build run at the same time.
  distDir: isDev ? ".next-dev" : ".next",
  reactStrictMode: false,
  env: {
    // Laravel Backend API (no trailing slash)
    API_PROD_URL: process.env.API_PROD_URL || "https://api.cuple.shop/api/admin",
    storageURL: process.env.storageURL || "https://api.cuple.shop/storage",
    IMAGE_URL: process.env.IMAGE_URL || "https://api.cuple.shop/",
    ADMIN_URL: process.env.ADMIN_URL || "https://admin.cuple.shop",
  },
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/en",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },
  rewrites: async () => {
    return [
      {
        source: "/api/menu",
        destination: "https://api.cuple.shop/api/admin/menu",
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cuple.ae",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cuple.ae",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.cuple.shop",
        pathname: "/**",
      },
    ],
  }
};

module.exports = nextConfig;
