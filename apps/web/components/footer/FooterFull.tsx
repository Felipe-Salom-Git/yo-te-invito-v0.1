'use client';

import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { resolveFooterContact } from '@/lib/navigation/footerPublicContact';
import {
  FOOTER_QUICK_LINKS,
  FOOTER_VERTICAL_LINKS,
} from '@/lib/navigation/footerPublicConfig';
import { FooterBrandBlock } from './FooterBrandBlock';
import { FooterContactBlock } from './FooterContactBlock';
import { FooterDeveloperCredit } from './FooterDeveloperCredit';
import { FooterLegalSection } from './FooterLegalSection';
import { FooterLinksGroup } from './FooterLinksGroup';
import { FooterSocialLinks } from './FooterSocialLinks';
import { FooterTrustBlock } from './FooterTrustBlock';
import { resolveFooterSocialLinks } from './footerSocialUtils';
import { footerContainerClass, footerShellClass } from './footerStyles';

export function FooterFull() {
  const { data: platformConfig } = usePublicPlatformConfig();
  const contact = resolveFooterContact(platformConfig);
  const socialItems = resolveFooterSocialLinks(platformConfig);

  return (
    <footer className={footerShellClass} role="contentinfo">
      <div
        className={`${footerContainerClass} py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-10 sm:pb-10 lg:py-12`}
      >
        <div className="grid min-w-0 grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-9 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-10">
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <FooterBrandBlock />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <FooterLinksGroup
              title="Verticales"
              links={FOOTER_VERTICAL_LINKS}
              ariaLabel="Verticales de contenido"
            />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <FooterLinksGroup
              title="Accesos rápidos"
              links={FOOTER_QUICK_LINKS}
              ariaLabel="Accesos rápidos del sitio"
            />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <FooterContactBlock contact={contact} />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-8">
            <FooterLegalSection />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <FooterTrustBlock />
          </div>
        </div>

        <div className="mt-8 flex min-w-0 flex-col gap-6 border-t border-white/10 pt-6 sm:mt-10 sm:pt-8 md:flex-row md:items-start md:justify-between">
          <FooterSocialLinks items={socialItems} />
          <div className="min-w-0 space-y-2 md:text-left">
            <FooterDeveloperCredit />
            <p className="break-words text-xs text-text-muted">
              © {new Date().getFullYear()} Yo Te Invito. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
