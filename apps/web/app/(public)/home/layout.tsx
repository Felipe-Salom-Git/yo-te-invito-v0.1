import type { Metadata } from 'next';
import { OG_SHARE_METADATA } from '@/lib/seo/brandAssets';

/**
 * Server segment config for `/home`.
 * Page body stays client (`page.tsx`); config cannot live in `'use client'` files.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HOME_DESCRIPTION =
  'Descubrí eventos, experiencias, propuestas gastronómicas, hoteles y servicios para vivir tu ciudad.';

export const metadata: Metadata = {
  title: 'Yo Te Invito',
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/home',
  },
  openGraph: {
    title: 'Yo Te Invito',
    description: HOME_DESCRIPTION,
    url: '/home',
    type: 'website',
    images: [OG_SHARE_METADATA],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yo Te Invito',
    description: HOME_DESCRIPTION,
    images: [OG_SHARE_METADATA.url],
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
