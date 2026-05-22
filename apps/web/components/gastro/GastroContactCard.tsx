'use client';

import { RentalContactCard } from '@/components/rentals/RentalContactCard';

type GastroContactCardProps = {
  whatsAppHref: string | null;
};

/** WhatsApp / consulta — sin checkout ni reservas inventadas. */
export function GastroContactCard({ whatsAppHref }: GastroContactCardProps) {
  if (!whatsAppHref) {
    return (
      <section className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Contacto
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          No hay WhatsApp publicado. Podés usar el teléfono o los enlaces del local si están
          disponibles.
        </p>
      </section>
    );
  }

  return <RentalContactCard whatsAppHref={whatsAppHref} />;
}
