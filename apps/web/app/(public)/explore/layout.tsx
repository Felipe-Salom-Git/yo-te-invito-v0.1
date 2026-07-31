import type { Metadata } from 'next';

/**
 * Server segment config for `/explore`.
 * Page body stays client (`page.tsx`); config cannot live in `'use client'` files.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Explorar',
  description:
    'Explorá eventos, excursiones, gastronomía, hoteles y servicios disponibles en Yo Te Invito.',
  alternates: {
    canonical: '/explore',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
