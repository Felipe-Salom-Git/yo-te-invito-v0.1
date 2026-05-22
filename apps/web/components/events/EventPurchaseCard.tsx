'use client';

import Link from 'next/link';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Button } from '@/components';
import { useAddToCart } from '@/hooks/useAddToCart';

const TRUST_BULLETS = [
  'Tickets digitales con QR',
  'Validación inmediata',
];

export interface EventPurchaseCardProps {
  eventId: string;
  eventTitle: string;
  tenantId: string;
  ticketTypes: TicketTypeResponse[];
  qtyByType: Record<string, number>;
  onQtyChange: (ticketTypeId: string, qty: number) => void;
  onAddToCart: (tt: TicketTypeResponse, qty: number) => void;
  /** Optional: show popularity badge when ratingAvg >= 4.5 and ratingCount >= 10 */
  ratingAvg?: number | null;
  ratingCount?: number;
}

export function EventPurchaseCard({
  eventId,
  eventTitle,
  tenantId,
  ticketTypes,
  qtyByType,
  onQtyChange,
  onAddToCart,
  ratingAvg,
  ratingCount,
}: EventPurchaseCardProps) {
  const { cartHref } = useAddToCart();

  if (ticketTypes.length === 0) return null;

  const totalAvailable = ticketTypes.reduce(
    (sum, tt) => sum + (tt.capacityAvailable ?? 0),
    0
  );
  const showScarcity = totalAvailable > 0 && totalAvailable <= 30;
  const showPopular = ratingAvg != null && ratingAvg >= 4.5 && (ratingCount ?? 0) >= 10;
  return (
    <div
      id="comprar"
      className="rounded-xl border border-border bg-bg-muted p-5 shadow-lg md:sticky md:top-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Entradas</h2>
        {showPopular && (
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
            Mejor valorado
          </span>
        )}
      </div>
      {showScarcity && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-400">
          <span aria-hidden>⚠️</span> Quedan pocas entradas
        </p>
      )}
      <div className="mt-4 space-y-4">
        {ticketTypes.map((tt) => {
          const qty = qtyByType[tt.id] ?? 0;
          const price = typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price;
          const maxQty = Math.min(10, tt.capacityAvailable ?? 0);
          return (
            <div
              key={tt.id}
              className="rounded-lg border border-border/80 bg-bg/50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-white">{tt.name}</h3>
                  <p className="mt-1 text-accent font-medium">
                    ${typeof tt.price === 'string' ? tt.price : Number(tt.price).toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-text-muted">
                    {tt.capacityAvailable} disponibles
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxQty}
                    value={qty}
                    onChange={(e) =>
                      onQtyChange(tt.id, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-16 rounded border border-border bg-bg px-2 py-2 text-center text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    aria-label={`Cantidad ${tt.name}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => onAddToCart(tt, qty || 1)}
                    disabled={qty < 1}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link
          href={cartHref}
          className="inline-flex items-center justify-center rounded-lg border border-accent px-4 py-2.5 font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Ir al carrito
        </Link>
        <Link
          href={`/checkout/${eventId}?tenantId=${tenantId}`}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 font-semibold text-bg shadow-accent-glow transition-all hover:bg-accent-hover"
        >
          Comprar directo
        </Link>
      </div>
      <ul className="mt-4 space-y-2 border-t border-border pt-4">
        {TRUST_BULLETS.map((b, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
            <span className="text-accent" aria-hidden>✔</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
