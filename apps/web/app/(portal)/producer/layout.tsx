'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { Role } from '@yo-te-invito/shared';

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF]} requiredProfile="producer">
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="producer">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
