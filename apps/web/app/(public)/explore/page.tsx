'use client';

import { Suspense } from 'react';
import { ExplorePageContent } from '@/components/explore/ExplorePageContent';
import { PageContainer } from '@/components';
import { ContentCardSkeleton } from '@/components/home/ContentCardSkeleton';

function ExploreLoadingFallback() {
  return (
    <PageContainer>
      <p className="text-text-muted">Cargando exploración…</p>
      <div className="mt-8 flex flex-wrap gap-5 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
    </PageContainer>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoadingFallback />}>
      <ExplorePageContent />
    </Suspense>
  );
}
