import type { Metadata } from 'next';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  CATEGORY_LANDING_META,
  isCategoryLandingId,
} from '@/lib/categories/categoryLandingConfig';

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryLandingId(category)) {
    return {
      title: 'Categoría no encontrada',
      robots: { index: false, follow: false },
    };
  }

  const meta = CATEGORY_LANDING_META[category as CategoryGatewayId];
  return {
    title: meta.title,
    description: meta.editorialDescription,
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

