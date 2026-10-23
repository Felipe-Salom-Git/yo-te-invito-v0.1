'use client';

import { useMemo } from 'react';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { getPortalNavDefinition, type PortalNavItem, type PortalNavKey } from '@/lib/navigation/portalNavConfig';
import { useGastroActiveLocationOptional } from '@/lib/gastro/GastroActiveLocationContext';
import { withCourtesyProfileQuery } from '@/lib/gastro/courtesy-scope';
import { useIsMasterUser } from '@/hooks/useIsMasterUser';
import { MobilePortalNav } from './MobilePortalNav';
import { MasterMobilePortalNav } from './MasterMobilePortalNav';
import { MasterPortalSidebar } from './MasterPortalSidebar';
import { PortalLegalPendingBanner } from '@/components/legal/PortalLegalPendingBanner';
import { PostRegisterEmailNotice } from '@/components/auth/PostRegisterEmailNotice';
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
export function useScopedPortalNavItems(portalKey: PortalNavKey): PortalNavItem[] {
  const gastro = useGastroActiveLocationOptional();
  const { items } = getPortalNavDefinition(portalKey);
  const profileId = portalKey === 'gastro' ? gastro?.profileId : undefined;
  return useMemo(() => {
    if (!profileId) return items;
    return items.map((item) => ({
      ...item,
      href: withCourtesyProfileQuery(item.href, profileId),
    }));
  }, [items, profileId]);
}

export function PortalLayoutShell({
  portalKey,
  children,
  showPublicHomeLink,
}: PortalLayoutShellProps) {
  const isMaster = useIsMasterUser();
  const items = useScopedPortalNavItems(portalKey);

  if (isMaster) {
    return (
      <PortalPageProvider>
        <MasterMobilePortalNav showPublicHomeLink={showPublicHomeLink} />
        <MasterPortalSidebar>
          <PostRegisterEmailNotice />
          {children}
        </MasterPortalSidebar>
      </PortalPageProvider>
    );
  }

  const showLegalBanner = portalHasLegalProfile(portalKey);

  return (
    <PortalPageProvider>
      <MobilePortalNav portalKey={portalKey} items={items} showPublicHomeLink={showPublicHomeLink} />
      <PortalSidebar items={items}>
        <PostRegisterEmailNotice />
        {showLegalBanner ? <PortalLegalPendingBanner portalKey={portalKey} /> : null}
        {children}
      </PortalSidebar>
    </PortalPageProvider>
  );
}
