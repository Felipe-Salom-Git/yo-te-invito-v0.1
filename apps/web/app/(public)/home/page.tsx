'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { HomeLanding } from '@/components/home/HomeLanding';
import { isCategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { clearLastSeen } from '@/lib/introStorage';

function HomePageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const initialCategory = useMemo(() => {
    if (isCategoryGatewayId(categoryParam)) return categoryParam;
    return null;
  }, [categoryParam]);

  const handleReplayIntro = () => {
    if (typeof window === 'undefined') return;
    clearLastSeen();
    window.location.href = '/';
  };

  return (
    <>
      <HomeLanding initialCategory={initialCategory} />
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <button
          type="button"
          onClick={handleReplayIntro}
          className="text-sm text-text-muted transition-colors hover:text-accent"
        >
          Replay Intro
        </button>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomePageContent />
    </Suspense>
  );
}
