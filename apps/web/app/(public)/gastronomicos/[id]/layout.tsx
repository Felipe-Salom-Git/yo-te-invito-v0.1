import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

async function fetchGastroPublic(id: string, tenantId: string): Promise<any | null> {
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
}

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

export default function GastroPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}

