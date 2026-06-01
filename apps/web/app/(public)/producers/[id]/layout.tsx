import type { Metadata } from 'next';
import { cache } from 'react';
import { buildProducerJsonLd } from '@/lib/seo/jsonld';
import { FALLBACK_OG_IMAGE, summarize } from '@/lib/seo/metadata';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';

type Props = { params: Promise<{ id: string }> };

const fetchPublicProducer = cache(async (id: string) => {
  const url = new URL(`/public/producers/${encodeURIComponent(id)}`, API_BASE);
  url.searchParams.set('tenantId', DEFAULT_TENANT);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return (await res.json()) as any;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const producer = await fetchPublicProducer(id);
    if (!producer) {
      return { title: 'Productora no encontrada', robots: { index: false, follow: false } };
    }
    const title =
      producer?.displayName
        ? String(producer.displayName)
        : producer?.name
          ? String(producer.name)
          : 'Productora';
    const description =
      summarize(producer?.longDescription) ??
      summarize(producer?.shortDescription) ??
      `Conocé a ${title} en Yo Te Invito.`;
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

export default async function ProducerPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <ProducerJsonLd id={id} />
      {children}
    </>
  );
}

async function ProducerJsonLd({ id }: { id: string }) {
  const producer = await fetchPublicProducer(id);
  if (!producer) return null;

  const name =
    producer?.displayName
      ? String(producer.displayName)
      : producer?.name
        ? String(producer.name)
        : 'Productora';

  const jsonLd = buildProducerJsonLd({
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club'}/producers/${encodeURIComponent(id)}`,
    name,
    description:
      typeof producer?.longDescription === 'string'
        ? producer.longDescription
        : typeof producer?.shortDescription === 'string'
          ? producer.shortDescription
          : null,
    logoUrl: typeof producer?.logoUrl === 'string' ? producer.logoUrl : null,
    imageUrl: typeof producer?.coverImageUrl === 'string' ? producer.coverImageUrl : null,
    websiteUrl: typeof producer?.websiteUrl === 'string' ? producer.websiteUrl : null,
    instagramUrl: typeof producer?.instagramUrl === 'string' ? producer.instagramUrl : null,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

