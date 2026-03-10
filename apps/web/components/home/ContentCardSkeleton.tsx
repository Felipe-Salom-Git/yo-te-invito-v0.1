'use client';

import { motion } from 'framer-motion';

export function ContentCardSkeleton() {
  return (
    <motion.div
      className="relative flex h-[180px] w-[280px] flex-shrink-0 overflow-hidden rounded-lg border border-border/60 bg-bg-muted sm:h-[200px] sm:w-[320px] md:h-[220px] md:w-[360px]"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-border/40 via-border/20 to-border/40" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
      </div>
    </motion.div>
  );
}
