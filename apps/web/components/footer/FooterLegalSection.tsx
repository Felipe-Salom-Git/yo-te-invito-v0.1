import Link from 'next/link';
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_LEGAL_LINKS_ESSENTIAL,
  type FooterLegalLink,
} from '@/lib/navigation/footerLegalLinks';
import { footerLinkClass, footerSectionTitle } from './footerStyles';

type Props = {
  links?: FooterLegalLink[];
  compact?: boolean;
};

export function FooterLegalSection({ links = FOOTER_LEGAL_LINKS, compact }: Props) {
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
