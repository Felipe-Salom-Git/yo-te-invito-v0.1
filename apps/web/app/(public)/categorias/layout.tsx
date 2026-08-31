import type { Metadata } from 'next';
import { EXCURSION_PUBLIC_LABEL } from '@/lib/categories/excursionPublicCopy';

/**
 * Server segment config for `/categorias` gateway.
 * Page body stays client (`page.tsx`); config cannot live in `'use client'` files.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Categorías',
  description:
    `Navegá propuestas por categoría: eventos, gastronomía, ${EXCURSION_PUBLIC_LABEL.toLowerCase()}, hoteles, rentals y más.`,
  alternates: {
    canonical: '/categorias',
  },
};

export default function CategoriasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
