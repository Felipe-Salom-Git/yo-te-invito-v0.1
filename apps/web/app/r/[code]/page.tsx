'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { lookupReferral } from '@/lib/api/referrals';

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

  useEffect(() => {
    if (!code) {
      router.replace('/');
      return;
    }

    let cancelled = false;

    lookupReferral(code).then((result) => {
      if (cancelled) return;

      if (result.eventId) {
        setReferralCookie(code);
        router.replace(`/events/${result.eventId}?tenantId=${result.tenantId ?? 'default-tenant'}`);
      } else {
        router.replace('/');
      }
    }).catch(() => {
      if (!cancelled) router.replace('/');
    });

    return () => { cancelled = true; };
  }, [code, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-600">Redirecting…</p>
    </main>
  );
}
