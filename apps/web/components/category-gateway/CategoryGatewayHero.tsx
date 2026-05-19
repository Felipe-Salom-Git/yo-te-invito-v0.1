'use client';

import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import {
  CATEGORY_GATEWAY_HEADLINE,
  CATEGORY_GATEWAY_LOCATION,
  CATEGORY_GATEWAY_SUBTITLE_PREFIX,
} from '@/lib/home/categoryGatewayConfig';
import { gatewayHeroTransition } from './categoryGatewayMotion';

export interface CategoryGatewayHeroProps {
  showLogo?: boolean;
}

export function CategoryGatewayHero({ showLogo = true }: CategoryGatewayHeroProps) {
  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={gatewayHeroTransition}
      className="flex shrink-0 flex-col items-center text-center"
    >
      {showLogo && (
        <Logo
          variant="icon"
          width={32}
          height={32}
          className="mb-2.5 opacity-80 sm:mb-3"
          priority
          alt="Yo Te Invito"
        />
      )}

      <h1 className="gateway-poster-title max-w-[16ch] text-[1.65rem] leading-[0.92] sm:max-w-none sm:text-4xl md:text-[2.75rem]">
        {CATEGORY_GATEWAY_HEADLINE}
      </h1>

      <p className="mt-2 max-w-md text-[0.625rem] font-bold uppercase leading-snug tracking-[0.1em] text-white/90 sm:mt-2.5 sm:text-[0.7rem] sm:tracking-[0.12em]">
        <span>{CATEGORY_GATEWAY_SUBTITLE_PREFIX} </span>
        <span className="text-accent">EN {CATEGORY_GATEWAY_LOCATION}.</span>
      </p>
    </motion.header>
  );
}
