'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components';

/**
 * Legacy `/cuenta/solicitar-*` routes — registration is only via `/register` (V3.1 Etapa 1).
 */
export function LegacyProfileApplyRedirect() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    router.replace(status === 'authenticated' ? '/me/account' : '/register');
  }, [status, router]);

  return <PageLoader message="Redirigiendo…" />;
}
