'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SplashIntro } from '@/components/splash/SplashIntro';
import { HomeLanding } from '@/components/home/HomeLanding';
import { shouldShowIntro, setLastSeen } from '@/lib/introStorage';

export default function EntryPage() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (shouldShowIntro()) {
      setShowIntro(true);
    } else {
      router.replace('/home');
    }
  }, [router]);

  const handleFinish = () => {
    setLastSeen();
    setShowIntro(false);
    router.replace('/home');
  };

  if (showIntro === null) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="relative min-h-screen bg-black">
      {showIntro ? (
        <>
          <HomeLanding />
          <SplashIntro onFinish={handleFinish} />
        </>
      ) : (
        <div className="min-h-screen bg-black" />
      )}
    </div>
  );
}
