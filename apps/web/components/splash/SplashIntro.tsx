'use client';

import Image from 'next/image';
import { useEffect, useCallback, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

const DURATION = {
  scan: 2.2,
  glow: 0.5,
  hold: 0.1,
  fade: 2,
};
const TOTAL_MS = (DURATION.scan + DURATION.glow + DURATION.hold + DURATION.fade) * 1000;
const INTRO_SFX_SRC = '/brand/light_saber.mp3';
const INTRO_LOGO_SRC = '/brand/logo_2.png';

export interface SplashIntroProps {
  onFinish: () => void;
  /** Fires when splash fade-out begins — use to reveal gateway underneath */
  onFadeStart?: () => void;
}

export function SplashIntro({ onFinish, onFadeStart }: SplashIntroProps) {
  const scanCtrl = useAnimation();
  const maskCtrl = useAnimation();
  const glowCtrl = useAnimation();
  const fadeCtrl = useAnimation();
  const logoOutCtrl = useAnimation();

  const introAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopIntroAudio = useCallback(() => {
    const audio = introAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const finish = useCallback(() => {
    stopIntroAudio();
    onFinish();
  }, [onFinish, stopIntroAudio]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const audio = new Audio(INTRO_SFX_SRC);
        introAudioRef.current = audio;
        audio.preload = 'auto';
        void audio.play().catch(() => {
          // Autoplay might be blocked; intro should continue silently.
        });
      } catch {
        // Ignore audio errors; intro should still run.
      }

      // 1–2: Scan line (bottom → top, fade out) + mask reveal (parallel)
      await Promise.all([
        scanCtrl.start({
          bottom: ['0%', '100%'],
          opacity: [1, 0],
          transition: { duration: DURATION.scan, ease: [0.2, 0.8, 0.2, 1] },
        }),
        maskCtrl.start({
          clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
          transition: { duration: DURATION.scan, ease: [0.2, 0.8, 0.2, 1] },
        }),
      ]);
      if (cancelled) return;

      // 3–4: Glow pulse
      await glowCtrl.start({
        opacity: [0, 0.75, 0.55],
        scale: [1, 1.06, 1.03],
        transition: {
          duration: DURATION.glow + DURATION.hold,
          times: [0, 0.5, 1],
          ease: 'easeOut',
        },
      });
      if (cancelled) return;

      // 5: Fade out — reveal gateway underneath while splash dissolves
      onFadeStart?.();

      await Promise.all([
        fadeCtrl.start({
          opacity: 0,
          transition: { duration: DURATION.fade, ease: 'easeInOut' },
        }),
        logoOutCtrl.start({
          opacity: [1, 0],
          scale: [1, 1.02],
          filter: ['blur(0px)', 'blur(16px)'],
          transition: { duration: DURATION.fade, ease: 'easeInOut' },
        }),
      ]);
      if (cancelled) return;

      finish();
    };

    run();
    return () => {
      cancelled = true;
      stopIntroAudio();
    };
  }, [scanCtrl, maskCtrl, glowCtrl, fadeCtrl, logoOutCtrl, finish, stopIntroAudio, onFadeStart]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={fadeCtrl}
      style={{ willChange: 'opacity' }}
    >
      {/* Skip */}
      <button
        type="button"
        onClick={() => {
          onFadeStart?.();
          finish();
        }}
        className="absolute bottom-4 right-4 z-10 text-sm text-white/50 transition-colors hover:text-accent-soft"
        aria-label="Saltar intro"
      >
        Saltar
      </button>

      {/* Full-screen green glow (stronger + stays across page) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        initial={{ opacity: 0, scale: 1 }}
        animate={glowCtrl}
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 55%, rgba(16, 185, 129, 0.32), transparent 70%)',
          filter: 'blur(18px)',
          willChange: 'opacity, transform',
        }}
      />

      {/* Logo container + scan line */}
      <div className="relative flex min-h-[560px] w-full max-w-4xl items-center justify-center px-4 md:min-h-[680px] md:max-w-6xl">
        <div className="relative z-10 h-80 w-full max-w-[96%] md:h-[26rem] md:max-w-[92%]">
          {/* Logo with mask reveal */}
          <motion.div
            className="absolute inset-0"
            animate={maskCtrl}
            initial={{ clipPath: 'inset(100% 0 0 0)' }}
            style={{ willChange: 'clip-path' }}
          >
            <motion.div
              className="absolute inset-0"
              animate={logoOutCtrl}
              initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              style={{ willChange: 'opacity, transform, filter' }}
            >
              <Image
                src={INTRO_LOGO_SRC}
                alt="Logo"
                fill
                sizes="(min-width: 768px) 1280px, 800px"
                className="object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Green scan line: synced to logo height */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-20 h-1"
            animate={scanCtrl}
            initial={{ bottom: '0%', opacity: 1 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.95), transparent)',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.9)',
              willChange: 'bottom, opacity',
            }}
          />
        </div>

      </div>
    </motion.div>
  );
}
