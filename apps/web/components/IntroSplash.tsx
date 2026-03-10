'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';

const INTRO_SEEN_KEY = 'yti:intro-seen';

export function IntroSplash() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'scan' | 'glow' | 'done'>('scan');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(INTRO_SEEN_KEY);
    const forceIntro = typeof window !== 'undefined' && window.location.search.includes('intro=1');
    if (!seen || forceIntro) {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setPhase('glow'), 1200);
    const t2 = setTimeout(() => {
      setPhase('done');
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      setShow(false);
      router.replace('/');
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show, router]);

  const handleSkip = () => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setShow(false);
    router.replace('/');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
        >
          Saltar
        </button>

        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-accent/90"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <motion.div
            className="relative z-20"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: phase === 'glow' ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <Logo
              width={64}
              height={64}
              className="h-16 w-auto brightness-0 invert"
            />
          </motion.div>
        </div>

        {phase === 'glow' && (
          <motion.div
            className="absolute inset-0 pointer-events-none bg-accent/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
