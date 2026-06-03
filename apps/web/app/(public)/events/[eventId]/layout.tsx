import type { Metadata } from 'next';
import { cache } from 'react';
import { buildEventJsonLd } from '@/lib/seo/jsonld';
import { FALLBACK_OG_IMAGE, summarize } from '@/lib/seo/metadata';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';

type Props = { params: Promise<{ eventId: string }> };

const fetchPublicEvent = cache(async (eventId: string) => {
  const url = new URL(`/public/events/${encodeURIComponent(eventId)}`, API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return (await res.json()) as any;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;

  try {
    const event = await fetchPublicEvent(eventId);
    if (!event) return {};
    const title = event?.title ?? 'Evento';
    const description = summarize(event?.description);
    const image = event?.coverImageUrl ?? undefined;

    return {
      title,
      description: description ?? `Descubrí ${title} en Yo Te Invito`,
      openGraph: {
        title,
        description: description ?? `Descubrí ${title} en Yo Te Invito`,
        url: `/events/${encodeURIComponent(eventId)}`,
        images: image
          ? [{ url: image, alt: title }]
          : [{ url: FALLBACK_OG_IMAGE, alt: 'Yo Te Invito' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description ?? `Descubrí ${title} en Yo Te Invito`,
        images: image ? [image] : [FALLBACK_OG_IMAGE],
      },
      alternates: {
        canonical: `/events/${encodeURIComponent(eventId)}`,
      },
    };
  } catch {
    return { title: 'Evento | Yo Te Invito' };
  }
}

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <>
      <EventJsonLd eventId={eventId} />
      {children}
    </>
  );
}

async function EventJsonLd({ eventId }: { eventId: string }) {
  const event = await fetchPublicEvent(eventId);
  if (!event) return null;

  const title = typeof event?.title === 'string' && event.title.trim() ? event.title : 'Evento';
  const jsonLd = buildEventJsonLd({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club'}/events/${encodeURIComponent(eventId)}`,
    name: title,
    description: typeof event?.description === 'string' ? event.description : null,
    image: typeof event?.coverImageUrl === 'string' ? event.coverImageUrl : null,
    startAt: typeof event?.startAt === 'string' ? event.startAt : null,
    endAt: typeof event?.endAt === 'string' ? event.endAt : null,
    venueName: typeof event?.venueName === 'string' ? event.venueName : null,
    venueAddress: typeof event?.venueAddress === 'string' ? event.venueAddress : null,
    city: typeof event?.city === 'string' ? event.city : null,
    province: typeof event?.province === 'string' ? event.province : null,
    geoLat: typeof event?.geoLat === 'number' ? event.geoLat : null,
    geoLng: typeof event?.geoLng === 'number' ? event.geoLng : null,
    producer: event?.producer ? { displayName: event.producer.displayName } : null,
    fromPrice: typeof event?.fromPrice === 'number' ? event.fromPrice : null,
    currency: 'ARS',
  });

  return (
    <script
      type="application/ld+json"
      // JSON-LD is intentionally serialized from trusted API data + fixed strings only.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
