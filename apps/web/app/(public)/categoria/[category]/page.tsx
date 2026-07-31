'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import { CategoryLandingPage } from '@/components/categories/CategoryLandingPage';
import { CategoryComingSoonScreen } from '@/components/categories/CategoryComingSoonScreen';
import { isCategoryLandingId } from '@/lib/categories/categoryLandingConfig';
import {
  canAccessPublicCategory,
  isCategoryComingSoon,
} from '@/lib/categories/categoryAvailability';
import { useRole } from '@/hooks/useRole';
import { CATEGORY_LANDING_META } from '@/lib/categories/categoryLandingConfig';

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { role, status } = useRole();
  const categoryParam = typeof params.category === 'string' ? params.category : '';
  const subcategory =
    searchParams.get('subcategory') ?? searchParams.get('subcategoryId');

  if (!isCategoryLandingId(categoryParam)) {
    notFound();
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-black" />;
  }

  if (isCategoryComingSoon(categoryParam) && !canAccessPublicCategory(categoryParam, role)) {
    return (
      <CategoryComingSoonScreen
        categoryLabel={CATEGORY_LANDING_META[categoryParam].title}
      />
    );
  }

  return (
    <CategoryLandingPage category={categoryParam} subcategorySlug={subcategory} />
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CategoryPageContent />
    </Suspense>
  );
}
