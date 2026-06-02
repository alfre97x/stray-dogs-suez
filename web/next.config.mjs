/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the floating Next.js dev-tools logo/indicator in the corner.
  devIndicators: false,
  images: {
    // Dog photos are served from the S3-compatible public bucket (Hetzner today).
    // Add the public base host here so next/image can optimize them.
    remotePatterns: [
      { protocol: "https", hostname: "*.your-objectstorage.com" },
    ],
  },
  async headers() {
    return [
      {
        // The service worker must be served from the root scope.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
