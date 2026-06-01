import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    const url = new URL(`/public/producers/${encodeURIComponent(id)}`, API_BASE);
    url.searchParams.set('tenantId', tenantId);
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) {
      return { title: 'Productora no encontrada', robots: { index: false, follow: false } };
    }

    const producer = (await res.json()) as any;
    const title =
      producer?.displayName
        ? String(producer.displayName)
        : producer?.name
          ? String(producer.name)
          : 'Productora';
    const rawDescription =
      typeof producer?.description === 'string'
        ? producer.description
        : typeof producer?.bio === 'string'
          ? producer.bio
          : '';
    const description =
      rawDescription?.trim()
        ? rawDescription.slice(0, 160)
        : `Conocé a ${title} en Yo Te Invito.`;
    const image =
      typeof producer?.coverImageUrl === 'string'
        ? producer.coverImageUrl
        : typeof producer?.logoUrl === 'string'
          ? producer.logoUrl
          : null;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/producers/${encodeURIComponent(id)}`,
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
        canonical: `/producers/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Productora | Yo Te Invito' };
  }
}

export default function ProducerPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}

