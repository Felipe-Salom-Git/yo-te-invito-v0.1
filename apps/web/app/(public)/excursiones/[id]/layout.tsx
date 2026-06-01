import type { Metadata } from 'next';
import { cache } from 'react';
import { buildEventJsonLd } from '@/lib/seo/jsonld';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';
const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

type Props = { params: Promise<{ id: string }> };

const fetchPublicEvent = cache(async (id: string) => {
  const url = new URL(`/public/events/${encodeURIComponent(id)}`, API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return (await res.json()) as any;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    // Excursions detail is currently backed by the public Event detail endpoint (category=excursion).
    const event = await fetchPublicEvent(id);
    if (!event) {
      return { title: 'Excursión no encontrada', robots: { index: false, follow: false } };
    }

    const title = event?.title ? String(event.title) : 'Excursión';
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
        url: `/excursiones/${encodeURIComponent(id)}`,
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
        canonical: `/excursiones/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Excursión | Yo Te Invito' };
  }
}

export default async function ExcursionDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ExcursionJsonLd id={id} />
      {children}
    </>
  );
}

async function ExcursionJsonLd({ id }: { id: string }) {
  const event = await fetchPublicEvent(id);
  if (!event) return null;

  const title =
    typeof event?.title === 'string' && event.title.trim() ? event.title : 'Excursión';
  const jsonLd = buildEventJsonLd({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club'}/excursiones/${encodeURIComponent(id)}`,
    name: title,
    description: typeof event?.description === 'string' ? event.description : null,
    image: typeof event?.coverImageUrl === 'string' ? event.coverImageUrl : null,
    startAt: typeof event?.startAt === 'string' ? event.startAt : null,
    endAt: typeof event?.endAt === 'string' ? event.endAt : null,
    venueName: typeof event?.venueName === 'string' ? event.venueName : null,
    venueAddress: typeof event?.venueAddress === 'string' ? event.venueAddress : null,
    city: typeof event?.city === 'string' ? event.city : null,
    geoLat: typeof event?.geoLat === 'number' ? event.geoLat : null,
    geoLng: typeof event?.geoLng === 'number' ? event.geoLng : null,
    producer: event?.producer ? { displayName: event.producer.displayName } : null,
    fromPrice: typeof event?.fromPrice === 'number' ? event.fromPrice : null,
    currency: 'ARS',
  });

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

