import type { Metadata } from 'next';
import { cache } from 'react';
import { buildHotelJsonLd } from '@/lib/seo/jsonld';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

const fetchPublicHotel = cache(async (id: string) => {
  const url = new URL(`/public/hotel-locations/by-event/${encodeURIComponent(id)}`, API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return (await res.json()) as any;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    // Public hotel detail is keyed by eventId in the route.
    const item = await fetchPublicHotel(id);
    if (!item) {
      return { title: 'Hotel no encontrado', robots: { index: false, follow: false } };
    }

    const title =
      item?.displayName ? String(item.displayName) : item?.name ? String(item.name) : 'Hotel';
    const rawDescription =
      typeof item?.description === 'string'
        ? item.description
        : typeof item?.about === 'string'
          ? item.about
          : '';
    const description =
      rawDescription?.trim()
        ? rawDescription.slice(0, 160)
        : `Conocé ${title} en Yo Te Invito.`;
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
        url: `/hoteles/${encodeURIComponent(id)}`,
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
        canonical: `/hoteles/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Hotel | Yo Te Invito' };
  }
}

export default async function HotelPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <HotelJsonLd id={id} />
      {children}
    </>
  );
}

async function HotelJsonLd({ id }: { id: string }) {
  const item = await fetchPublicHotel(id);
  if (!item) return null;

  const name = item?.displayName ? String(item.displayName) : item?.name ? String(item.name) : 'Hotel';
  const jsonLd = buildHotelJsonLd({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club'}/hoteles/${encodeURIComponent(id)}`,
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
    ratingAvg: typeof item?.ratingAvg === 'number' ? item.ratingAvg : null,
    ratingCount: typeof item?.ratingCount === 'number' ? item.ratingCount : null,
  });

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

