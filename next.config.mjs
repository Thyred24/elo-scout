/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The launcher opens 127.0.0.1 to preserve the browser's existing app data.
  // Allow the Next.js dev client to connect to its HMR endpoint on that host.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
