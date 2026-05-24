'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { Role } from '@yo-te-invito/shared';

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.HOTEL_OWNER]} requiredProfile="hotel">
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="hotel">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
