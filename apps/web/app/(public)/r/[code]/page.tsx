'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRepositories } from '@/repositories/context';

const COOKIE_NAME = 'yti_ref';
const COOKIE_DAYS = 30;

function setReferralCookie(code: string) {
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

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

    repos.referrals.lookup(code).then((result) => {
      if (cancelled) return;

      if (result.eventId) {
        setReferralCookie(code);
        router.replace(`/events/${result.eventId}?tenantId=${result.tenantId ?? 'default-tenant'}`);
      } else {
        router.replace('/home');
      }
    }).catch(() => {
      if (!cancelled) router.replace('/home');
    });

    return () => { cancelled = true; };
  }, [code, router, repos]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-text-muted">Redirecting…</p>
    </div>
  );
}
