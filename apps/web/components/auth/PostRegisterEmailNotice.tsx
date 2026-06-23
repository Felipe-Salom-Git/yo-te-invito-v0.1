'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmailInboxNotice } from '@/components/ux/EmailInboxNotice';

function PostRegisterEmailNoticeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const registered = searchParams.get('registered') === '1';

  const dismiss = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('registered');
    router.replace(url.pathname + (url.search || ''), { scroll: false });
  }, [router]);

  if (!registered) return null;

  return (
    <div className="mb-4">
      <EmailInboxNotice variant="register" />
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
      >
        Entendido
      </button>
    </div>
  );
}

export function PostRegisterEmailNotice() {
  return (
    <Suspense fallback={null}>
      <PostRegisterEmailNoticeContent />
    </Suspense>
  );
}

export function withRegisteredQuery(href: string): string {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('registered', '1');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
