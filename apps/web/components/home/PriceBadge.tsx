'use client';

/** Optional "desde" price display for content cards. Renders nothing when no price. */
export interface PriceBadgeProps {
  /** Minimum/from price in pesos (cents or units). Only rendered when defined. */
  fromPrice?: number | null;
  /** Currency symbol. Default: $. */
  currency?: string;
  className?: string;
}

function formatPrice(value: number): string {
  if (value >= 1000) {
    return `${Math.floor(value / 1000)}.${String(value % 1000).padStart(3, '0')}`;
  }
  return String(value);
}

export function PriceBadge({
  fromPrice,
  currency = '$',
  className = '',
}: PriceBadgeProps) {
  if (fromPrice == null) return null;

  const formatted = formatPrice(fromPrice);

  return (
    <span
      className={`inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm ${className}`}
      aria-label={`Desde ${currency}${formatted}`}
    >
      Desde {currency}{formatted}
    </span>
  );
}
