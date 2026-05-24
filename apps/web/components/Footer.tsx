'use client';

import Link from 'next/link';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export function Footer() {
  const { data: config } = usePlatformConfig();
  const contact = config?.contact ?? { email: '', phone: '', address: '' };
  const hasContact = contact.email || contact.phone || contact.address;

  return (
    <footer className="mt-auto border-t border-border bg-bg-muted" role="contentinfo">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
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
          <nav className="flex gap-6 text-sm text-text-muted" aria-label="Enlaces del sitio">
            <Link href="/home" className={`rounded transition-colors hover:text-accent ${navFocusRing}`}>
              Eventos
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
