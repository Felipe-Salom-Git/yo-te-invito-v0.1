'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { Role } from '@yo-te-invito/shared';

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF]} requiredProfile="producer">
      <div className="mx-auto max-w-7xl">
        <PortalLayoutShell portalKey="producer">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
