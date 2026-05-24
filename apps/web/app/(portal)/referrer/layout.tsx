'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { Role } from '@yo-te-invito/shared';

export default function ReferrerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.REFERRER]} requiredProfile="referrer">
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="referrer">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
