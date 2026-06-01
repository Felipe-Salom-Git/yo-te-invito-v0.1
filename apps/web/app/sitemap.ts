import type { MetadataRoute } from 'next';
import { PUBLIC_LEGAL_SLUGS } from '@/lib/legal/public-legal-config';

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return raw && raw.startsWith('http') ? raw.replace(/\/$/, '') : 'https://yoteinvito.club';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/categorias`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/categoria/event`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/gastro`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/rental`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/excursion`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Legal slugs are stable routes; include them with low priority.
  const legalEntries: MetadataRoute.Sitemap = PUBLIC_LEGAL_SLUGS.map((slug) => ({
    url: `${baseUrl}/legal/${slug}`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  // Intentionally excluded (SEO 4): dynamic entity pages until we implement a safe dynamic sitemap (SEO 9).
  // Intentionally excluded (SEO 4): /hoteles is “Próximamente” and is marked noindex.
  return [...staticEntries, ...legalEntries];
}

