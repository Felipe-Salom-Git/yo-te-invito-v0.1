'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Role } from '@yo-te-invito/shared';
import { PageLoader } from '@/components';
import { getPortalHomeHrefForUser } from '@/lib/navigation/rolePortalHome';

/**
 * Legacy `/profiles` — redirects to role portal home (V3.1 Etapa 1).
 * No longer shows profile selector / apply CTAs.
 */
export default function ProfilesRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.replace('/login?callbackUrl=%2Fprofiles');
      return;
    }

    const role = (session.user as { role?: Role }).role;
    router.replace(getPortalHomeHrefForUser(session.user.email, role));
  }, [session, status, router]);

  return <PageLoader message="Redirigiendo a tu panel…" />;
}
