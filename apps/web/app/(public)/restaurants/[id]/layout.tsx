import type { Metadata } from 'next';

// Discovery route: id = publicEventId (Event.id). Profile canonical lives at /gastronomicos/[profileId].

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    alternates: {
      canonical: `/restaurants/${encodeURIComponent(id)}`,
    },
    robots: { index: false, follow: false },
  };
}

export default function RestaurantsAliasLayout({ children }: { children: React.ReactNode }) {
  return children;
}

