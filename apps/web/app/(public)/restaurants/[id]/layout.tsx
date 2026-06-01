import type { Metadata } from 'next';

// This route is an alias/legacy shape for gastro public pages.
// Canonical is kept on /gastronomicos/[id] to avoid contradictory metadata (SEO 6 can fully dedupe).

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    alternates: {
      canonical: `/gastronomicos/${encodeURIComponent(id)}`,
    },
  };
}

export default function RestaurantsAliasLayout({ children }: { children: React.ReactNode }) {
  return children;
}

