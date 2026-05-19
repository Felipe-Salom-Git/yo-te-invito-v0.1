'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRepositories } from '@/repositories/context';
import { setReferralCodeCookie } from '@/lib/referral-cookie';

const DEFAULT_TENANT = 'tenant-demo';

export default function ReferralRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) ?? '';
  const repos = useRepositories();

  useEffect(() => {
    if (!code) {
      router.replace('/home');
      return;
    }

    let cancelled = false;

    repos.referrals
      .lookup(code)
      .then((result) => {
        if (cancelled) return;

        if (result.eventId) {
          setReferralCodeCookie(code);
          const t = result.tenantId?.trim() || DEFAULT_TENANT;
          router.replace(
            `/checkout/${result.eventId}?tenantId=${encodeURIComponent(t)}&ref=${encodeURIComponent(code)}`,
          );
        } else {
          router.replace('/home');
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/home');
      });

    return () => {
      cancelled = true;
    };
  }, [code, router, repos]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-text-muted">Te llevamos al checkout…</p>
    </div>
  );
}
