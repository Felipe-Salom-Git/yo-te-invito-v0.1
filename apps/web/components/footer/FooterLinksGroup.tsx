import Link from 'next/link';
import type { FooterNavLink } from '@/lib/navigation/footerPublicConfig';
import {
  footerComingSoonBadge,
  footerLinkClass,
  footerSectionTitle,
} from './footerStyles';

type Props = {
  title: string;
  links: FooterNavLink[];
  ariaLabel: string;
  /** Tighter list for legal grid */
  dense?: boolean;
};

export function FooterLinksGroup({ title, links, ariaLabel, dense }: Props) {
  return (
    <nav className="min-w-0" aria-label={ariaLabel}>
      <p className={footerSectionTitle}>{title}</p>
      <ul
        className={
          dense
            ? 'mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2'
            : 'mt-3 flex flex-col gap-1'
        }
      >
        {links.map((item) => (
          <li key={item.id} className="min-w-0">
            {item.disabled ? (
              <span
                className={`${footerLinkClass} cursor-default hover:text-text-muted`}
                aria-disabled="true"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={footerLinkClass}
                aria-label={item.comingSoon ? `${item.label}, próximamente` : undefined}
              >
                {item.label}
                {item.comingSoon ? (
                  <span className={footerComingSoonBadge} aria-hidden="true">
                    Próximamente
                  </span>
                ) : null}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
