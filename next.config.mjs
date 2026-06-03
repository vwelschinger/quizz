/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build "standalone" : génère un server.js minimal pour le conteneur Docker.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
