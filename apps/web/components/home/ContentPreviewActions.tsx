'use client';

import Link from 'next/link';

export interface ContentPreviewActionsProps {
  detailHref: string;
  onClose: () => void;
  onExpand: () => void;
  canExpand: boolean;
  priceLabel: string | null;
}

export function ContentPreviewActions({
  detailHref,
  onClose,
  onExpand,
  canExpand,
  priceLabel,
}: ContentPreviewActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Primary CTA */}
      <Link
        href={detailHref}
        onClick={onClose}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent px-6 py-3 font-semibold text-bg shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-muted"
      >
        Ver detalle
      </Link>

      {/* Expand button — Ver similares */}
      {canExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/25 bg-transparent px-5 py-3 font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ver similares
        </button>
      )}

      {priceLabel && (
        <span
          className="ml-auto rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent"
          aria-label={priceLabel}
        >
          {priceLabel}
        </span>
      )}
    </div>
  );
}
