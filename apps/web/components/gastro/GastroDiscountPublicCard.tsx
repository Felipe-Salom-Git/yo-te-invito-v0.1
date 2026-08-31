'use client';

import Link from 'next/link';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';
import { getGastroDiscountLocationHref } from '@/lib/gastro/discount-location-href';

export function GastroDiscountPublicCard({ discount }: { discount: PublicGastroDiscountListItem }) {
  const title = discount.title?.trim() || 'Descuento';
  const href = getGastroDiscountLocationHref(discount);

  return (
    <Link
      href={href}
      aria-label={`${title} en ${discount.locationName}`}
      className="group block w-[220px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-accent/50 active:border-accent/60 sm:w-[240px]"
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
        <span className="absolute left-2 top-2 rounded-md border border-accent/40 bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Descuento
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-white/65">{discount.locationName}</p>
      </div>
    </Link>
  );
}
