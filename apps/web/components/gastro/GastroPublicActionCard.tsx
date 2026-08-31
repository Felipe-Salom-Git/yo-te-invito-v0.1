'use client';

type GastroPublicActionCardProps = {
  whatsAppHref: string | null;
  bookingUrl?: string | null;
  hasDiscounts: boolean;
};

const PRIMARY_BTN =
  'flex min-h-[48px] w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-bg transition-colors hover:bg-accent-hover active:bg-accent-hover';

const SECONDARY_BTN =
  'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-accent/40 bg-transparent px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent/10';

/** Primary / secondary CTAs for public gastro fichas (contact + discounts). */
export function GastroPublicActionCard({
  whatsAppHref,
  bookingUrl,
  hasDiscounts,
}: GastroPublicActionCardProps) {
  const primaryHref = whatsAppHref ?? (bookingUrl?.trim() || null);
  const primaryLabel = whatsAppHref
    ? 'Consultar por WhatsApp'
    : bookingUrl?.trim()
      ? 'Reservar'
      : null;
  const primaryExternal = Boolean(whatsAppHref || bookingUrl?.trim());

  if (!primaryHref && !hasDiscounts) return null;

  return (
    <section className="rounded-xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Contacto</h2>
      {primaryHref && primaryLabel ? (
        <a
          href={primaryHref}
          {...(primaryExternal
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          className={`mt-3 ${PRIMARY_BTN}`}
        >
          {primaryLabel}
        </a>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          Consultá horarios y enlaces del local más abajo.
        </p>
      )}
      {hasDiscounts ? (
        <a href="#gastro-discounts" className={SECONDARY_BTN}>
          Ver descuentos
        </a>
      ) : null}
    </section>
  );
}
