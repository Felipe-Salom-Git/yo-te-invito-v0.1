'use client';

import {
  RENTAL_DETAIL_CTA_BUTTON,
  RENTAL_PUBLIC_CTA_LOCAL,
} from '@/lib/rentals/publicCopy';
import { RENTAL_DETAIL_CARD_CLASS } from '@/lib/rentals/rentalDetailUi';

type RentalContactCardProps = {
  whatsAppHref: string | null;
};

export function RentalContactCard({ whatsAppHref }: RentalContactCardProps) {
  return (
    <section className={RENTAL_DETAIL_CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Disponibilidad
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{RENTAL_PUBLIC_CTA_LOCAL}</p>
      {whatsAppHref ? (
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-bg hover:bg-accent-hover active:bg-accent-hover"
        >
          {RENTAL_DETAIL_CTA_BUTTON}
        </a>
      ) : (
        <div
          className="mt-4 flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-lg border border-border bg-bg px-5 py-3 text-center text-sm font-medium text-text-muted"
          aria-disabled="true"
        >
          Contacto no disponible por WhatsApp
        </div>
      )}
    </section>
  );
}
