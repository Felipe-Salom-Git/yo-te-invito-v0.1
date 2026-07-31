/**
 * Server segment config for `/categoria/[category]`.
 * Page body stays client (`page.tsx`); config cannot live in `'use client'` files.
 * Metadata lives in `[category]/layout.tsx`.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CategoriaSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
