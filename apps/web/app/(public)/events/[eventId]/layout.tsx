import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const tenantId = DEFAULT_TENANT;

  try {
    const url = new URL(`/public/events/${encodeURIComponent(eventId)}`, API_BASE);
    url.searchParams.set('tenantId', tenantId);
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const event = await res.json();
    const title = event?.title ?? 'Evento';
    const description =
      typeof event?.description === 'string'
        ? event.description.slice(0, 160)
        : undefined;
    const image = event?.coverImageUrl ?? undefined;

    return {
      title: `${title} | Yo Te Invito`,
      description: description ?? `Descubrí ${title} en Yo Te Invito`,
      openGraph: {
        title,
        description: description ?? `Descubrí ${title} en Yo Te Invito`,
        images: image ? [{ url: image, alt: title }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description ?? `Descubrí ${title} en Yo Te Invito`,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: 'Evento | Yo Te Invito' };
  }
}

export default function EventDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
