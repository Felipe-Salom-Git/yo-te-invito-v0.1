'use client';

import { RENTAL_DETAIL_CARD_CLASS } from '@/lib/rentals/rentalDetailUi';

type Props = {
  whatsAppHref: string | null;
  telHref: string | null;
  contactEmail: string | null;
};

export function HotelContactCard({ whatsAppHref, telHref, contactEmail }: Props) {
  const hasAny = whatsAppHref || telHref || contactEmail?.trim();

  return (
    <section className={RENTAL_DETAIL_CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Contacto</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Consultá directamente con el establecimiento. No hay reservas ni pagos en Yo Te Invito.
      </p>
      {whatsAppHref ? (
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-bg hover:bg-accent-hover"
        >
          Escribir por WhatsApp
        </a>
      ) : null}
      {telHref ? (
        <a
          href={telHref}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-text hover:border-accent/40"
        >
          Llamar
        </a>
      ) : null}
      {contactEmail?.trim() ? (
        <a
          href={`mailto:${contactEmail.trim()}`}
          className="mt-3 block text-center text-sm text-accent hover:underline"
        >
          {contactEmail.trim()}
        </a>
      ) : null}
      {!hasAny ? (
        <p className="mt-4 text-xs text-text-muted">Sin datos de contacto publicados.</p>
      ) : null}
    </section>
  );
}
