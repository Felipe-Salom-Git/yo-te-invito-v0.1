'use client';

import { motion } from 'framer-motion';
import {
  CATEGORY_GATEWAY_OPTIONS,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';
import {
  gatewayGridVariants,
  gatewayScreenTransition,
} from './categoryGatewayMotion';
import { CategoryGatewayHero } from './CategoryGatewayHero';
import { CategoryGatewayTile } from './CategoryGatewayTile';

export type CategoryGatewayVariant = 'overlay' | 'page';

export interface CategoryGatewayScreenProps {
  onSelectCategory: (category: CategoryGatewayId) => void;
  /** overlay = post-splash fullscreen; page = /categorias with site navbar */
  variant?: CategoryGatewayVariant;
  showLogo?: boolean;
}

export function CategoryGatewayScreen({
  onSelectCategory,
  variant = 'overlay',
  showLogo,
}: CategoryGatewayScreenProps) {
  const isOverlay = variant === 'overlay';
  const logoVisible = showLogo ?? isOverlay;

  return (
    <motion.div
      className={
        isOverlay
          ? 'fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-black text-white'
          : 'flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-black text-white sm:min-h-[calc(100dvh-5rem)]'
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={gatewayScreenTransition}
    >
      <main
        className={
          isOverlay
            ? 'mx-auto flex h-full w-full max-w-lg flex-col px-3 pb-3 pt-4 sm:max-w-xl sm:px-4 sm:pb-4 sm:pt-5 md:max-w-2xl lg:max-w-4xl'
            : 'mx-auto flex min-h-0 flex-1 w-full max-w-lg flex-col px-3 pb-3 pt-4 sm:max-w-xl sm:px-4 sm:pb-4 sm:pt-5 md:max-w-2xl lg:max-w-4xl'
        }
      >
        <CategoryGatewayHero showLogo={logoVisible} />

        <motion.div
          className="mt-4 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 sm:mt-5 sm:gap-2"
          role="list"
          aria-label="Categorías de experiencias"
          variants={gatewayGridVariants}
          initial="hidden"
          animate="visible"
        >
          {CATEGORY_GATEWAY_OPTIONS.map((option) => (
            <CategoryGatewayTile
              key={option.id}
              option={option}
              onSelect={onSelectCategory}
            />
          ))}
        </motion.div>
      </main>
    </motion.div>
  );
}
