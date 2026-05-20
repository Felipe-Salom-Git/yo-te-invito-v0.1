'use client';

import Link from 'next/link';

export interface EventMobileStickyCtaProps {
  eventTitle: string;
  /** Optional price from cheapest ticket */
  fromPrice?: number | null;
  eventId: string;
  tenantId: string;
  /** Primary CTA label */
  ctaLabel?: string;
}

export function EventMobileStickyCta({
  eventTitle,
  fromPrice,
  eventId,
  tenantId,
  ctaLabel = 'Comprar entradas',
}: EventMobileStickyCtaProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{eventTitle}</p>
        {fromPrice != null && fromPrice > 0 && (
          <p className="text-xs text-text-muted">Desde ${fromPrice.toLocaleString('es-AR')}</p>
        )}
      </div>
      <Link
        href={`/checkout/${eventId}?tenantId=${tenantId}`}
        className="flex-shrink-0 rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg shadow-lg shadow-accent-glow transition-all hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent-muted focus:ring-offset-2 focus:ring-offset-bg"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
