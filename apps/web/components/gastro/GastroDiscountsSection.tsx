'use client';

import Link from 'next/link';
import type { PublicGastroLocationDiscount } from '@/repositories/interfaces';

function formatValue(d: PublicGastroLocationDiscount): string {
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

type GastroDiscountsSectionProps = {
  discounts: PublicGastroLocationDiscount[];
  /** When true, show empty state copy instead of hiding the section */
  showEmpty?: boolean;
};

export function GastroDiscountsSection({
  discounts,
  showEmpty = true,
}: GastroDiscountsSectionProps) {
  if (discounts.length === 0) {
    if (!showEmpty) return null;
    return (
      <section
        className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-6"
        aria-label="Promociones"
      >
        <h2 className="text-lg font-semibold text-text">Promociones y descuentos</h2>
        <p className="mt-2 text-sm text-text-muted">
          Este local no tiene cupones activos por ahora. Volvé más tarde o explorá otros
          restaurantes.
        </p>
        <Link
          href="/explore?category=gastro"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Ver gastronomía →
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-accent/5 p-5">
      <h2 className="text-lg font-semibold text-text">Promociones y descuentos</h2>
      <p className="mt-1 text-sm text-text-muted">
        Reclamá tu código QR gratis y presentalo en el local.
      </p>
      <ul className="mt-4 space-y-4">
        {discounts.map((d) => {
          const title = d.title?.trim() || 'Descuento';
          const dateLabel = formatDate(d.discountDate);
          return (
            <li
              key={d.id}
              className="overflow-hidden rounded-xl border border-border bg-bg-muted/90"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
                {d.headerImageUrl ? (
                  <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-border sm:h-auto sm:w-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.headerImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text">{title}</p>
                  {d.summary?.trim() && (
                    <p className="mt-1 text-sm text-text-muted">{d.summary.trim()}</p>
                  )}
                  {d.detail?.trim() && (
                    <p className="mt-2 text-sm text-text-muted">{d.detail.trim()}</p>
                  )}
                  <p className="mt-2 text-sm">
                    <span className="font-medium text-accent">{formatValue(d)}</span>
                    {dateLabel && (
                      <span className="text-text-muted"> · Válido desde {dateLabel}</span>
                    )}
                  </p>
                  <Link
                    href={`/descuentos/${d.id}`}
                    className="mt-3 inline-block rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg hover:opacity-90"
                  >
                    Reclamar QR gratis
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
