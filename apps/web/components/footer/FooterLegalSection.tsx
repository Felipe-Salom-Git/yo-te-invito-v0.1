import { Fragment } from 'react';
import Link from 'next/link';
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_LEGAL_LINKS_ESSENTIAL,
  type FooterLegalLink,
} from '@/lib/navigation/footerLegalLinks';
import {
  footerInlineLinkClass,
  footerLegalRowClass,
  footerLegalSeparatorClass,
  footerLinkClass,
  footerSectionTitle,
} from './footerStyles';

type Props = {
  links?: FooterLegalLink[];
  /** Checkout / legal pages — lista compacta */
  compact?: boolean;
  /** Footer full — links en fila horizontal con separadores */
  inline?: boolean;
};

export function FooterLegalSection({
  links = FOOTER_LEGAL_LINKS,
  compact,
  inline,
}: Props) {
  if (inline) {
    return (
      <nav className="min-w-0" aria-label="Información legal">
        <ul className={footerLegalRowClass}>
          {links.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 ? (
                <li className={footerLegalSeparatorClass} aria-hidden="true">
                  •
                </li>
              ) : null}
              <li className="min-w-0">
                <Link href={link.href} className={footerInlineLinkClass}>
                  {link.label}
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="min-w-0" aria-label="Información legal">
      <p className={footerSectionTitle}>Legales</p>
      <ul
        className={
          compact
            ? 'mt-3 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4'
            : 'mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2'
        }
      >
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link href={link.href} className={footerLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { FOOTER_LEGAL_LINKS_ESSENTIAL };
