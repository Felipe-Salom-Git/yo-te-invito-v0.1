'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryGatewayScreen } from '@/components/category-gateway/CategoryGatewayScreen';
import { SplashIntro } from '@/components/splash/SplashIntro';
import {
  getCategoryGatewayHref,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';
import { shouldShowIntro, setLastSeen } from '@/lib/introStorage';

type EntryPhase = 'loading' | 'splash' | 'gateway';

export default function EntryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<EntryPhase>('loading');
  const [gatewayVisible, setGatewayVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (shouldShowIntro()) {
      setPhase('splash');
    } else {
      router.replace('/home');
    }
  }, [router]);

  const handleSplashFadeStart = useCallback(() => {
    setGatewayVisible(true);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setLastSeen();
    setPhase('gateway');
  }, []);

  const handleCategorySelect = useCallback(
    (category: CategoryGatewayId) => {
      router.replace(getCategoryGatewayHref(category));
    },
    [router],
  );

  if (phase === 'loading') {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="relative min-h-screen bg-black">
      {gatewayVisible && (
        <CategoryGatewayScreen onSelectCategory={handleCategorySelect} />
      )}

      {phase === 'splash' && (
        <SplashIntro
          onFadeStart={handleSplashFadeStart}
          onFinish={handleSplashFinish}
        />
      )}
    </div>
  );
}
