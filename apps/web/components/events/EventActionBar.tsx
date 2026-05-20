'use client';

import { useCallback, useState } from 'react';
import { shareUrl } from '@/lib/share/shareUrl';
import { useToast } from '@/components';

export interface EventActionBarProps {
  /** Callback for primary CTA (buy / reserve / contact) */
  onBuyClick: () => void;
  /** Callback to open location modal */
  onLocationClick: () => void;
  /** Callback to scroll to reviews section */
  onReviewsClick: () => void;
  /** Event title and URL for share */
  shareTitle: string;
  shareUrl: string;
  /** Primary CTA label; defaults to "Comprar entradas" */
  primaryCtaLabel?: string;
}

export function EventActionBar({
  onBuyClick,
  onLocationClick,
  onReviewsClick,
  shareTitle,
  shareUrl: urlToShare,
  primaryCtaLabel = 'Comprar entradas',
}: EventActionBarProps) {
  const { addToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const result = await shareUrl({
        title: shareTitle,
        url: urlToShare,
        text: shareTitle,
      });
      if (result.success) {
        addToast(result.method === 'copy' ? 'Link copiado' : 'Compartido', 'success');
      } else if (result.error && result.error !== 'Cancelled') {
        addToast(result.error, 'error');
      }
    } finally {
      setIsSharing(false);
    }
  }, [shareTitle, urlToShare, addToast]);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onBuyClick}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg shadow-lg shadow-accent-glow transition-all hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent-muted focus:ring-offset-2 focus:ring-offset-bg"
      >
        {primaryCtaLabel}
      </button>
      <button
        type="button"
        onClick={onLocationClick}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/40 bg-white/5 px-4 py-2.5 font-medium text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-bg"
      >
        Ver ubicación
      </button>
      <button
        type="button"
        onClick={onReviewsClick}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/40 bg-white/5 px-4 py-2.5 font-medium text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-bg"
      >
        Ver valoraciones
      </button>
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/40 bg-white/5 px-4 py-2.5 font-medium text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50"
      >
        {isSharing ? '...' : 'Compartir'}
      </button>
    </div>
  );
}
