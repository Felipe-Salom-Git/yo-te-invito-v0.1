import type { Metadata } from 'next';
import { cache } from 'react';
import { FALLBACK_OG_IMAGE, summarize } from '@/lib/seo/metadata';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const DEFAULT_TENANT = 'tenant-demo';

type Props = { params: Promise<{ id: string }> };

const fetchPublishedDiscount = cache(async (discountId: string, tenantId: string) => {
  const url = new URL(
    `/public/gastro-discounts/${encodeURIComponent(discountId)}`,
    API_BASE,
  );
  url.searchParams.set('tenantId', tenantId);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json() as Promise<{
    title?: string | null;
    summary?: string | null;
    detail?: string | null;
    locationName?: string;
    headerImageUrl?: string | null;
    imageUrls?: string[];
  }>;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const discount = await fetchPublishedDiscount(id, DEFAULT_TENANT);
    if (!discount) {
      return { title: 'Descuento no encontrado', robots: { index: false, follow: false } };
    }

    const discountTitle = discount.title?.trim() || 'Descuento';
    const locationName = discount.locationName?.trim() || 'Local gastronómico';
    const title = `${discountTitle} — ${locationName}`;
    const description =
      summarize(discount.summary) ||
      summarize(discount.detail) ||
      `Descuento en ${locationName} en Yo Te Invito.`;
    const image =
      (typeof discount.headerImageUrl === 'string' && discount.headerImageUrl.trim()) ||
      (Array.isArray(discount.imageUrls) && discount.imageUrls[0]?.trim()) ||
      null;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/descuentos/${encodeURIComponent(id)}`,
        images: image
          ? [{ url: image, alt: discountTitle }]
          : [{ url: FALLBACK_OG_IMAGE, alt: 'Yo Te Invito' }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : [FALLBACK_OG_IMAGE],
      },
      alternates: {
        canonical: `/descuentos/${encodeURIComponent(id)}`,
      },
    };
  } catch {
    return { title: 'Descuento | Yo Te Invito' };
  }
}

export default function PublicDiscountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
