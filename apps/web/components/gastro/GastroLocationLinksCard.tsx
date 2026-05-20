'use client';

const CARD_CLASS = 'rounded-xl border border-border bg-bg-muted p-5';

type GastroLocationLinksCardProps = {
  menuUrl?: string | null;
  websiteUrl?: string | null;
  contactPhone?: string | null;
};

export function GastroLocationLinksCard({
  menuUrl,
  websiteUrl,
  contactPhone,
}: GastroLocationLinksCardProps) {
  const hasMenu = Boolean(menuUrl?.trim());
  const hasWeb = Boolean(websiteUrl?.trim());
  const hasPhone = Boolean(contactPhone?.trim());

  if (!hasMenu && !hasWeb && !hasPhone) return null;

  return (
    <section className={CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Más información
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {hasMenu && (
          <li>
            <a
              href={menuUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Ver carta / menú
            </a>
          </li>
        )}
        {hasWeb && (
          <li>
            <a
              href={websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Sitio web
            </a>
          </li>
        )}
        {hasPhone && (
          <li>
            <a href={`tel:${contactPhone}`} className="text-text hover:text-accent">
              {contactPhone}
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}
