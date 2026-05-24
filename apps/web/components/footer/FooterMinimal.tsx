'use client';

import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { resolveFooterContact } from '@/lib/navigation/footerPublicContact';
import { FooterContactBlock } from './FooterContactBlock';
import { FooterLegalSection, FOOTER_LEGAL_LINKS_ESSENTIAL } from './FooterLegalSection';
import { footerContainerClass, footerShellClass } from './footerStyles';

export function FooterMinimal() {
  const { data: platformConfig } = usePublicPlatformConfig();
  const contact = resolveFooterContact(platformConfig);

  return (
    <footer className={footerShellClass} role="contentinfo">
      <div
        className={`${footerContainerClass} py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Yo Te Invito
            </p>
            <div className="min-w-0 sm:max-w-xs">
              <FooterContactBlock contact={contact} compact />
            </div>
          </div>
          <FooterLegalSection links={FOOTER_LEGAL_LINKS_ESSENTIAL} compact />
        </div>
      </div>
    </footer>
  );
}
