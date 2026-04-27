/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "https://insideai.dk";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
