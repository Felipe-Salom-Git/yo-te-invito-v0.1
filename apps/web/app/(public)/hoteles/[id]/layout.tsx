import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    // Public hotel detail is keyed by eventId in the route.
    const url = new URL(`/public/hotel-locations/by-event/${encodeURIComponent(id)}`, API_BASE);
    url.searchParams.set('tenantId', tenantId);
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) {
      return { title: 'Hotel no encontrado', robots: { index: false, follow: false } };
    }

    const item = (await res.json()) as any;
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

export default function HotelPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}

