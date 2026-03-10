'use client';

import { HomeLanding } from '@/components/home/HomeLanding';
import { clearLastSeen } from '@/lib/introStorage';

export default function HomePage() {
  const handleReplayIntro = () => {
    if (typeof window === 'undefined') return;
    clearLastSeen();
    window.location.href = '/';
  };

  return (
    <>
      <HomeLanding />
      {/* Dev: Replay Intro */}
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
