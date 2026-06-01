import type { MetadataRoute } from 'next';

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return raw && raw.startsWith('http') ? raw.replace(/\/$/, '') : 'https://yoteinvito.club';
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/me',
          '/producer',
          '/gastro',
          '/hotel',
          '/referrer',
          '/auth',
          '/login',
          '/register',
          '/checkout',
          '/orders',
          '/tickets',
          '/scanner',
          '/api',
          '/dev',
          '/_next',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

