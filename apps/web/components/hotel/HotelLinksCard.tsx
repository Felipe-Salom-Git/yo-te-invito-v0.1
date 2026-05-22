'use client';

import { RENTAL_DETAIL_CARD_CLASS } from '@/lib/rentals/rentalDetailUi';

type Props = {
  websiteUrl: string | null;
  bookingUrl: string | null;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    tripadvisor?: string;
    other?: string;
  } | null;
};

function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function HotelLinksCard({ websiteUrl, bookingUrl, socialLinks }: Props) {
  const entries = socialLinks
    ? Object.entries(socialLinks).filter(([, v]) => typeof v === 'string' && v.trim())
    : [];
  const hasAny = websiteUrl?.trim() || bookingUrl?.trim() || entries.length > 0;
  if (!hasAny) return null;

  return (
    <section className={RENTAL_DETAIL_CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Enlaces</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {websiteUrl?.trim() ? (
          <li>
            <a
              href={websiteUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Sitio web — {linkLabel(websiteUrl.trim())}
            </a>
          </li>
        ) : null}
        {bookingUrl?.trim() ? (
          <li>
            <a
              href={bookingUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Reservas en sitio externo — {linkLabel(bookingUrl.trim())}
            </a>
            <p className="mt-0.5 text-xs text-text-muted">Canal ajeno a Yo Te Invito.</p>
          </li>
        ) : null}
        {entries.map(([key, value]) => (
          <li key={key}>
            <span className="capitalize text-text-muted">{key}: </span>
            <a
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {value}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
