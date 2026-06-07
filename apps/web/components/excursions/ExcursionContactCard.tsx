'use client';

const CARD_CLASS =
  'rounded-xl border border-accent/25 bg-accent/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

type ExcursionContactCardProps = {
  whatsAppHref: string;
};

export function ExcursionContactCard({ whatsAppHref }: ExcursionContactCardProps) {
  return (
    <section className={CARD_CLASS}>
      <p className="text-sm text-text-muted">
        Consultá disponibilidad directamente con el operador.
      </p>
      <a
        href={whatsAppHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-center text-sm font-semibold text-bg hover:bg-accent-hover"
      >
        Contactar por WhatsApp
      </a>
    </section>
  );
}
