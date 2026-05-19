/** Shared motion tokens — soft crossfade after splash */
export const GATEWAY_EASE = [0.25, 0.1, 0.25, 1] as const;

/** Full screen dissolve (overlaps splash fade-out) */
export const gatewayScreenTransition = {
  duration: 1.35,
  ease: GATEWAY_EASE,
} as const;

export const gatewayHeroTransition = {
  duration: 1.05,
  delay: 0.35,
  ease: GATEWAY_EASE,
} as const;

export const gatewayGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.45,
      staggerChildren: 0.14,
    },
  },
} as const;

export const gatewayTileVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.05,
      ease: GATEWAY_EASE,
    },
  },
} as const;
