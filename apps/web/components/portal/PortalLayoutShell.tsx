'use client';

import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { getPortalNavDefinition, type PortalNavKey } from '@/lib/navigation/portalNavConfig';
import { useIsMasterUser } from '@/hooks/useIsMasterUser';
import { MobilePortalNav } from './MobilePortalNav';
import { MasterMobilePortalNav } from './MasterMobilePortalNav';
import { MasterPortalSidebar } from './MasterPortalSidebar';
import { PortalLegalPendingBanner } from '@/components/legal/PortalLegalPendingBanner';
import { portalHasLegalProfile } from '@/lib/navigation/portalLegalProfile';
import { PortalPageProvider } from '@/lib/navigation/PortalPageContext';

export interface PortalLayoutShellProps {
  portalKey: PortalNavKey;
  children: React.ReactNode;
  /** Show «Volver al inicio público» in mobile portal drawer (`/me`). */
  showPublicHomeLink?: boolean;
}

/**
 * Portal chrome: mobile contextual nav + desktop sidebar (Slice 7).
 * Usuario maestro: sidebar unificado con acordeones por vertical.
 */
export function PortalLayoutShell({
  portalKey,
  children,
  showPublicHomeLink,
}: PortalLayoutShellProps) {
  const isMaster = useIsMasterUser();

  if (isMaster) {
    return (
      <PortalPageProvider>
        <MasterMobilePortalNav showPublicHomeLink={showPublicHomeLink} />
        <MasterPortalSidebar>{children}</MasterPortalSidebar>
      </PortalPageProvider>
    );
  }

  const { items } = getPortalNavDefinition(portalKey);
  const showLegalBanner = portalHasLegalProfile(portalKey);

  return (
    <PortalPageProvider>
      <MobilePortalNav portalKey={portalKey} showPublicHomeLink={showPublicHomeLink} />
      <PortalSidebar items={items}>
        {showLegalBanner ? <PortalLegalPendingBanner portalKey={portalKey} /> : null}
        {children}
      </PortalSidebar>
    </PortalPageProvider>
  );
}
