/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yo-te-invito/shared'],
  // /restaurants/[publicEventId] and /gastronomicos/[profileId] are distinct public routes.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/yti-prod-public-assets/**',
      },
    ],
  },
  /**
   * Defense-in-depth for public discovery HTML (CDN / reverse proxy).
   * Does not apply to `/_next/static/*` hashed assets.
   */
  async headers() {
    const noStore = {
      key: 'Cache-Control',
      value: 'private, no-cache, no-store, max-age=0, must-revalidate',
    };
    return [
      { source: '/', headers: [noStore] },
      { source: '/home', headers: [noStore] },
      { source: '/explore', headers: [noStore] },
      { source: '/explore/:path*', headers: [noStore] },
      { source: '/categorias', headers: [noStore] },
      { source: '/categoria/:path*', headers: [noStore] },
    ];
  },
};

module.exports = nextConfig;
