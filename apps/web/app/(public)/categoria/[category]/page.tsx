'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import { CategoryLandingPage } from '@/components/categories/CategoryLandingPage';
import { isCategoryLandingId } from '@/lib/categories/categoryLandingConfig';

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryParam = typeof params.category === 'string' ? params.category : '';
  const subcategory =
    searchParams.get('subcategory') ?? searchParams.get('subcategoryId');

  if (!isCategoryLandingId(categoryParam)) {
    notFound();
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
