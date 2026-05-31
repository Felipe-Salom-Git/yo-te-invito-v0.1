/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yo-te-invito/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/yti-prod-public-assets/**',
      },
    ],
  },
};

module.exports = nextConfig;
