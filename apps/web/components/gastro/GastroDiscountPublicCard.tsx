'use client';

import Link from 'next/link';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';

function formatValue(d: PublicGastroDiscountListItem): string {
  return d.type === 'PERCENT' ? `${d.value}%` : `$${d.value}`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GastroDiscountPublicCard({ discount }: { discount: PublicGastroDiscountListItem }) {
  const title = discount.title?.trim() || 'Descuento';
  const dateLabel = formatDate(discount.discountDate);

  return (
    <Link
      href={`/descuentos/${discount.id}`}
      className="group block w-[220px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-accent/50 sm:w-[240px]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        {discount.headerImageUrl ? (
          <img
            src={discount.headerImageUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-white/20">%</div>
        )}
        <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-xs font-bold text-bg">
          Gratis
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{discount.locationName}</p>
        {discount.summary?.trim() && (
          <p className="mt-1 line-clamp-2 text-xs text-white/50">{discount.summary.trim()}</p>
        )}
        <p className="mt-2 text-xs font-medium text-accent">
          {formatValue(discount)}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </p>
      </div>
    </Link>
  );
}
