'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader, PageContainer } from '@/components';

/** Recomendaciones integradas en el inicio `/me`. */
export default function MeRecommendationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/me');
  }, [router]);

  return (
    <PageContainer>
      <PageLoader message="Redirigiendo…" />
    </PageContainer>
  );
}
