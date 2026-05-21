'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader, PageContainer } from '@/components';

/** Ruta legacy: productoras seguidas viven en preferencias. */
export default function MeFollowingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/me/preferences?tab=producers');
  }, [router]);

  return (
    <PageContainer>
      <PageLoader message="Redirigiendo…" />
    </PageContainer>
  );
}
