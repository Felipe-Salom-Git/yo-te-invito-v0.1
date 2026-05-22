'use client';

import { RENTAL_DETAIL_CTA_BUTTON } from '@/lib/rentals/publicCopy';

type RentalMobileStickyCtaProps = {
  whatsAppHref: string;
};

/** Fixed bottom CTA on small viewports — keeps availability action reachable while scrolling. */
export function RentalMobileStickyCta({ whatsAppHref }: RentalMobileStickyCtaProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-bg/95 px-4 py-3 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <a
        href={whatsAppHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-bg shadow-lg shadow-black/30 hover:bg-accent-hover active:bg-accent-hover"
      >
        {RENTAL_DETAIL_CTA_BUTTON}
      </a>
    </div>
  );
}
