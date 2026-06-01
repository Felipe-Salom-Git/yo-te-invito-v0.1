import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    // Rentals detail is currently backed by the public Event detail endpoint.
    const url = new URL(`/public/events/${encodeURIComponent(id)}`, API_BASE);
    url.searchParams.set('tenantId', tenantId);
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) {
      return { title: 'Rental no encontrado', robots: { index: false, follow: false } };
    }

    const event = (await res.json()) as any;
    const title = event?.title ? String(event.title) : 'Rental';
    const rawDescription = typeof event?.description === 'string' ? event.description : '';
    const description =
      rawDescription?.trim()
        ? rawDescription.slice(0, 160)
        : `Descubrí ${title} en Yo Te Invito.`;
    const image = typeof event?.coverImageUrl === 'string' ? event.coverImageUrl : null;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/rentals/${encodeURIComponent(id)}`,
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
        canonical: `/rentals/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Rental | Yo Te Invito' };
  }
}

export default function RentalDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

