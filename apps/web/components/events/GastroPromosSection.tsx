'use client';

import type { PublicGastroDiscountSummary } from '@/repositories/interfaces';

function formatValue(d: PublicGastroDiscountSummary): string {
  return d.type === 'PERCENT' ? `${d.value}%` : `$${d.value}`;
}

function formatRange(d: PublicGastroDiscountSummary): string {
  const from = d.validFrom ? new Date(d.validFrom).toLocaleDateString('es-AR') : null;
  const to = d.validTo ? new Date(d.validTo).toLocaleDateString('es-AR') : null;
  if (from && to) return `${from} – ${to}`;
  if (to) return `Hasta ${to}`;
  if (from) return `Desde ${from}`;
  return 'Vigente';
}

export function GastroPromosSection({ discounts }: { discounts: PublicGastroDiscountSummary[] }) {
  if (discounts.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-accent/30 bg-accent/5 p-5">
      <h2 className="text-lg font-semibold text-text">Promociones</h2>
      <p className="mt-1 text-sm text-text-muted">
        Mostrá el código en el local o indicá el código al reservar. Sujeto a disponibilidad del restaurante.
      </p>
      <ul className="mt-4 space-y-4">
        {discounts.map((d) => {
          const imgs = d.displayImageUrls?.filter(Boolean) ?? [];
          const title = d.displayTitle?.trim() || d.code;
          return (
            <li
              key={d.id}
              className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg-muted/90 shadow-sm"
            >
              <div
                className="pointer-events-none absolute inset-x-10 top-0 h-3 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 5px, currentColor 5px, currentColor 7px)',
                }}
                aria-hidden
              />
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
                {imgs[0] ? (
                  <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-border sm:h-auto sm:w-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Cupón</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-accent">{title}</p>
                  <p className="mt-1 font-mono text-sm text-accent/90">{d.code}</p>
                  {d.displayDescription ? (
                    <p className="mt-2 text-sm text-text-muted">{d.displayDescription}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-text">
                    <span className="font-medium text-text">{formatValue(d)}</span>
                    <span className="text-text-muted"> · {formatRange(d)}</span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
