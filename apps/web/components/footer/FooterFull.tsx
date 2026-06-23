'use client';

import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { resolveFooterContact } from '@/lib/navigation/footerPublicContact';
import { FooterBrandBlock } from './FooterBrandBlock';
import { FooterContactBlock } from './FooterContactBlock';
import { FooterDeveloperCredit } from './FooterDeveloperCredit';
import { FooterInstagramHighlight } from './FooterInstagramHighlight';
import { FooterLegalSection } from './FooterLegalSection';
import { resolveFooterInstagramUrl } from './footerSocialUtils';
import {
  footerContainerClass,
  footerRowDividerClass,
  footerShellClass,
  footerTopColumnBrandClass,
  footerTopColumnInstagramClass,
  footerTopColumnSupportClass,
  footerTopRowClass,
} from './footerStyles';

export function FooterFull() {
  const { data: platformConfig } = usePublicPlatformConfig();
  const contact = resolveFooterContact(platformConfig);
  const instagramUrl = resolveFooterInstagramUrl(platformConfig);

  return (
    <footer className={footerShellClass} role="contentinfo">
      <div
        className={`${footerContainerClass} py-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-10`}
      >
        <div className={footerTopRowClass}>
          <div className={footerTopColumnBrandClass}>
            <FooterBrandBlock />
          </div>
          {instagramUrl ? (
            <div className={footerTopColumnInstagramClass}>
              <FooterInstagramHighlight href={instagramUrl} />
            </div>
          ) : null}
          <div className={footerTopColumnSupportClass}>
            <FooterContactBlock contact={contact} />
          </div>
        </div>

        <div className={`${footerRowDividerClass} mt-6 sm:mt-7`}>
          <FooterLegalSection inline />
        </div>

        <div className={`${footerRowDividerClass} mt-4 sm:mt-5`}>
          <FooterDeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
