'use client';

import type { EntitySocialLinks } from '@yo-te-invito/shared';
import { ENTITY_SOCIAL_LINK_LABELS_ES } from '@yo-te-invito/shared';

const CARD_CLASS =
  'rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

export type PublicExternalLinksCardProps = {
  title?: string;
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  menuUrl?: string | null;
  socialLinks?: EntitySocialLinks | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  className?: string;
};

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function PublicExternalLinksCard({
  title = 'Reservas y redes',
  websiteUrl,
  bookingUrl,
  menuUrl,
  socialLinks,
  contactPhone,
  contactEmail,
  className,
}: PublicExternalLinksCardProps) {
  const socialEntries = socialLinks
    ? (Object.entries(socialLinks) as Array<[keyof EntitySocialLinks, string]>).filter(
        ([, v]) => typeof v === 'string' && v.trim(),
      )
    : [];

  const hasExternal =
    Boolean(websiteUrl?.trim()) ||
    Boolean(bookingUrl?.trim()) ||
    Boolean(menuUrl?.trim()) ||
    socialEntries.length > 0;

  const hasContact = Boolean(contactPhone?.trim()) || Boolean(contactEmail?.trim());

  if (!hasExternal && !hasContact) return null;

  return (
    <section className={className ? `${CARD_CLASS} ${className}` : CARD_CLASS}>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-sm">
        {menuUrl?.trim() ? (
          <li>
            <a
              href={menuUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Ver carta / menú
            </a>
          </li>
        ) : null}
        {websiteUrl?.trim() ? (
          <li>
            <a
              href={websiteUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Sitio web — {linkHostname(websiteUrl.trim())}
            </a>
          </li>
        ) : null}
        {bookingUrl?.trim() ? (
          <li>
            <a
              href={bookingUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Reservas — {linkHostname(bookingUrl.trim())}
            </a>
            <p className="mt-0.5 text-xs text-text-muted">Canal externo al sitio del local/operador.</p>
          </li>
        ) : null}
        {socialEntries.map(([key, url]) => (
          <li key={key}>
            <a
              href={url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {ENTITY_SOCIAL_LINK_LABELS_ES[key]}
            </a>
          </li>
        ))}
        {contactPhone?.trim() ? (
          <li>
            <a href={`tel:${contactPhone.trim()}`} className="text-text hover:text-accent">
              Tel: {contactPhone.trim()}
            </a>
          </li>
        ) : null}
        {contactEmail?.trim() ? (
          <li>
            <a href={`mailto:${contactEmail.trim()}`} className="text-text hover:text-accent">
              {contactEmail.trim()}
            </a>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
