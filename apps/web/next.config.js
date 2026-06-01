/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yo-te-invito/shared'],
  async redirects() {
    return [
      {
        source: '/restaurants/:id',
        destination: '/gastronomicos/:id',
        permanent: true,
      },
    ];
  },
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
