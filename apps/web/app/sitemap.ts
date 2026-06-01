import type { MetadataRoute } from 'next';
import { PUBLIC_LEGAL_SLUGS } from '@/lib/legal/public-legal-config';

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return raw && raw.startsWith('http') ? raw.replace(/\/$/, '') : 'https://yoteinvito.club';
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';

type PublicEventsListResponse = {
  data: Array<{ id: string; startAt?: string | null; updatedAt?: string | null }>;
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

type PublicProducersListResponse = {
  producers: Array<{ id: string; updatedAt?: string | null }>;
  total: number;
};

type PublicGastroLocationsListResponse = {
  data: Array<{ id: string; updatedAt?: string | null }>;
};

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function listPublicEvents(params: { category: string; limit?: number; page?: number }) {
  const limit = params.limit ?? 100;
  const page = params.page ?? 1;
  const url = new URL('/public/events', API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));
  url.searchParams.set('category', params.category);
  return safeFetchJson<PublicEventsListResponse>(url.toString());
}

async function listPublicProducers(params: { limit?: number; page?: number }) {
  const limit = params.limit ?? 100;
  const page = params.page ?? 1;
  const url = new URL('/public/producers', API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));
  return safeFetchJson<PublicProducersListResponse>(url.toString());
}

async function listPublicGastroLocations(params: { limit?: number }) {
  const limit = params.limit ?? 500;
  const url = new URL('/public/gastro-locations', API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  url.searchParams.set('limit', String(limit));
  return safeFetchJson<PublicGastroLocationsListResponse>(url.toString());
}

function toDateOrNow(value: unknown, now: Date): Date {
  if (typeof value !== 'string' || !value.trim()) return now;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : now;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/categorias`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/categoria/event`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/gastro`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/rental`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/categoria/excursion`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/producers`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Legal slugs are stable routes; include them with low priority.
  const legalEntries: MetadataRoute.Sitemap = PUBLIC_LEGAL_SLUGS.map((slug) => ({
    url: `${baseUrl}/legal/${slug}`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  // Dynamic entries (SEO 9): only public endpoints, limited paging, and safe fallback.
  // Important: do NOT include private portals, auth, checkout, tickets/orders, dev, scanner, api routes.
  const dynamicEntries: MetadataRoute.Sitemap = [];

  // Events (category=event) -> /events/[id]
  const events = await listPublicEvents({ category: 'event', limit: 100, page: 1 });
  if (events?.data?.length) {
    for (const it of events.data) {
      dynamicEntries.push({
        url: `${baseUrl}/events/${encodeURIComponent(it.id)}`,
        lastModified: toDateOrNow(it.updatedAt ?? it.startAt, now),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  // Rentals (category=rental) -> /rentals/[id]
  const rentals = await listPublicEvents({ category: 'rental', limit: 100, page: 1 });
  if (rentals?.data?.length) {
    for (const it of rentals.data) {
      dynamicEntries.push({
        url: `${baseUrl}/rentals/${encodeURIComponent(it.id)}`,
        lastModified: toDateOrNow(it.updatedAt ?? it.startAt, now),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // Excursions (category=excursion) -> /excursiones/[id]
  const excursions = await listPublicEvents({ category: 'excursion', limit: 100, page: 1 });
  if (excursions?.data?.length) {
    for (const it of excursions.data) {
      dynamicEntries.push({
        url: `${baseUrl}/excursiones/${encodeURIComponent(it.id)}`,
        lastModified: toDateOrNow(it.updatedAt ?? it.startAt, now),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // Hotels are keyed by publicEventId (event category=hotel) -> /hoteles/[eventId]
  // /hoteles listing is noindex (coming soon), but detail pages may still be useful if they exist.
  const hotels = await listPublicEvents({ category: 'hotel', limit: 100, page: 1 });
  if (hotels?.data?.length) {
    for (const it of hotels.data) {
      dynamicEntries.push({
        url: `${baseUrl}/hoteles/${encodeURIComponent(it.id)}`,
        lastModified: toDateOrNow(it.updatedAt ?? it.startAt, now),
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  }

  // Gastro detail pages are canonical under /gastronomicos/[locationId]
  const gastro = await listPublicGastroLocations({ limit: 500 });
  if (gastro?.data?.length) {
    for (const it of gastro.data) {
      dynamicEntries.push({
        url: `${baseUrl}/gastronomicos/${encodeURIComponent(it.id)}`,
        lastModified: toDateOrNow(it.updatedAt, now),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  // Producers -> /producers/[id] (paged)
  const producersLimit = 100;
  const producersFirst = await listPublicProducers({ limit: producersLimit, page: 1 });
  if (producersFirst?.producers?.length) {
    const total = Math.max(0, producersFirst.total ?? 0);
    const totalPages = Math.min(20, Math.ceil(total / producersLimit) || 1);

    for (const p of producersFirst.producers) {
      dynamicEntries.push({
        url: `${baseUrl}/producers/${encodeURIComponent(p.id)}`,
        lastModified: toDateOrNow(p.updatedAt, now),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (let page = 2; page <= totalPages; page++) {
      const more = await listPublicProducers({ limit: producersLimit, page });
      if (!more?.producers?.length) break;
      for (const p of more.producers) {
        dynamicEntries.push({
          url: `${baseUrl}/producers/${encodeURIComponent(p.id)}`,
          lastModified: toDateOrNow(p.updatedAt, now),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  }

  return [...staticEntries, ...dynamicEntries, ...legalEntries];
}

