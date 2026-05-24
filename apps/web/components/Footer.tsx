'use client';

import { FooterFull } from '@/components/footer/FooterFull';
import { FooterMinimal } from '@/components/footer/FooterMinimal';
import type { FooterVariant } from '@/lib/navigation/footerVisibility';

export type FooterProps = {
  variant?: FooterVariant;
};

export function Footer({ variant = 'full' }: FooterProps) {
  if (variant === 'hidden') {
    return null;
  }

  if (variant === 'minimal') {
    return <FooterMinimal />;
  }

  return <FooterFull />;
}
