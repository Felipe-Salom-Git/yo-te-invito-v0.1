import type { FooterSocialDisplayItem } from './footerSocialUtils';
import { footerLinkClass, footerSectionTitle } from './footerStyles';

type Props = {
  items: FooterSocialDisplayItem[];
};

export function FooterSocialLinks({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav className="min-w-0" aria-label="Redes sociales de Yo Te Invito">
      <p className={footerSectionTitle}>Seguinos</p>
      <ul className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <a
              href={item.displayHref!}
              target="_blank"
              rel="noopener noreferrer"
              className={footerLinkClass}
              aria-label={`${item.label} de Yo Te Invito (se abre en una nueva pestaña)`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
