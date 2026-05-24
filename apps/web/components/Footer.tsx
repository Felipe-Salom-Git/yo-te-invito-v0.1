'use client';

import Link from 'next/link';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';
import { FOOTER_LEGAL_LINKS } from '@/lib/navigation/footerLegalLinks';

export function Footer() {
  const { data: config } = usePlatformConfig();
  const contact = config?.contact ?? { email: '', phone: '', address: '' };
  const hasContact = contact.email || contact.phone || contact.address;

  return (
    <footer className="mt-auto border-t border-border bg-bg-muted" role="contentinfo">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-text-muted">© {new Date().getFullYear()} Yo Te Invito</p>
            {hasContact && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-accent transition-colors">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="hover:text-accent transition-colors">
                    {contact.phone}
                  </a>
                )}
                {contact.address && <span>{contact.address}</span>}
              </div>
            )}
          </div>

          <nav
            className="min-w-0"
            aria-label="Información legal"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Legales
            </p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-text-muted sm:grid-cols-2">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded transition-colors hover:text-accent ${navFocusRing}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="flex shrink-0 flex-col gap-2 text-sm text-text-muted" aria-label="Enlaces del sitio">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Sitio</p>
            <Link href="/home" className={`rounded transition-colors hover:text-accent ${navFocusRing}`}>
              Eventos
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
