'use client';

import Link from 'next/link';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';
import {
  formatGastroDiscountBenefit,
  formatGastroDiscountValidityLabel,
} from '@/lib/gastro/discount-status-ui';

export function GastroDiscountPublicCard({ discount }: { discount: PublicGastroDiscountListItem }) {
  const title = discount.title?.trim() || 'Descuento';
  const benefit = formatGastroDiscountBenefit(discount);
  const dateLabel = formatGastroDiscountValidityLabel(discount);
  const summary = discount.summary?.trim() || null;
  const detail = discount.detail?.trim() || null;
  const hoverSnippet = detail && detail !== summary ? detail : null;

  return (
    <Link
      href={`/descuentos/${discount.id}`}
      className="group block w-[220px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-accent/50 sm:w-[240px]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        {discount.headerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={discount.headerImageUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-white/20">%</div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{discount.locationName}</p>
        <p className="mt-2 text-xs font-medium text-accent">{benefit}</p>
        {dateLabel ? <p className="mt-0.5 text-[11px] text-white/55">{dateLabel}</p> : null}
        {summary ? (
          <p className="mt-1.5 line-clamp-2 text-xs text-white/50">{summary}</p>
        ) : null}
        {hoverSnippet ? (
          <p className="mt-1 hidden line-clamp-2 text-xs text-white/45 group-hover:block">
            {hoverSnippet}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
