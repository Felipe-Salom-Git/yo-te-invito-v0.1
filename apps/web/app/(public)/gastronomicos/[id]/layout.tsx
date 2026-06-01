import type { Metadata } from 'next';
import { cache } from 'react';
import { buildGastroJsonLd } from '@/lib/seo/jsonld';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

const fetchGastroPublic = cache(async (id: string, tenantId: string): Promise<any | null> => {
  // Primary: locationId
  const direct = new URL(`/public/gastro-locations/${encodeURIComponent(id)}`, API_BASE);
  direct.searchParams.set('tenantId', tenantId);
  const res1 = await fetch(direct.toString(), { next: { revalidate: 60 } });
  if (res1.ok) return res1.json();

  // Fallback: by event id (legacy param naming in some routes)
  const byEvent = new URL(`/public/gastro-locations/by-event/${encodeURIComponent(id)}`, API_BASE);
  byEvent.searchParams.set('tenantId', tenantId);
  const res2 = await fetch(byEvent.toString(), { next: { revalidate: 60 } });
  if (res2.ok) return res2.json();

  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    const item = await fetchGastroPublic(id, tenantId);
    if (!item) {
      return { title: 'Gastronómico no encontrado', robots: { index: false, follow: false } };
    }

    const title =
      item?.displayName ? String(item.displayName) : item?.name ? String(item.name) : 'Gastronómico';
    const rawDescription =
      typeof item?.description === 'string'
        ? item.description
        : typeof item?.about === 'string'
          ? item.about
          : '';
    const description =
      rawDescription?.trim()
        ? rawDescription.slice(0, 160)
        : `Descubrí ${title} en Yo Te Invito.`;
    const image =
      typeof item?.bannerUrl === 'string'
        ? item.bannerUrl
        : typeof item?.logoUrl === 'string'
          ? item.logoUrl
          : null;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/gastronomicos/${encodeURIComponent(id)}`,
        images: image
          ? [{ url: image, alt: title }]
          : [{ url: FALLBACK_OG_IMAGE, alt: 'Yo Te Invito' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : [FALLBACK_OG_IMAGE],
      },
      alternates: {
        canonical: `/gastronomicos/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Gastronómico | Yo Te Invito' };
  }
}

export default async function GastroPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <GastroJsonLd id={id} />
      {children}
    </>
  );
}

async function GastroJsonLd({ id }: { id: string }) {
  const item = await fetchGastroPublic(id, DEFAULT_TENANT);
  if (!item) return null;

  const name =
    item?.displayName ? String(item.displayName) : item?.name ? String(item.name) : 'Gastronómico';
  const jsonLd = buildGastroJsonLd({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club'}/gastronomicos/${encodeURIComponent(id)}`,
    name,
    description: typeof item?.description === 'string' ? item.description : null,
    imageUrl: typeof item?.bannerUrl === 'string' ? item.bannerUrl : null,
    logoUrl: typeof item?.logoUrl === 'string' ? item.logoUrl : null,
    address: typeof item?.address === 'string' ? item.address : null,
    city: typeof item?.city === 'string' ? item.city : null,
    province: typeof item?.province === 'string' ? item.province : null,
    geoLat: typeof item?.geoLat === 'number' ? item.geoLat : null,
    geoLng: typeof item?.geoLng === 'number' ? item.geoLng : null,
    websiteUrl: typeof item?.websiteUrl === 'string' ? item.websiteUrl : null,
    menuUrl: typeof item?.menuUrl === 'string' ? item.menuUrl : null,
    ratingAvg: typeof item?.ratingAvg === 'number' ? item.ratingAvg : null,
    ratingCount: typeof item?.ratingCount === 'number' ? item.ratingCount : null,
  });

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

