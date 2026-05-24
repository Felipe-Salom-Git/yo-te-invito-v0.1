'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { Role } from '@yo-te-invito/shared';

export default function ReferrerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.REFERRER]} requiredProfile="referrer">
      <div className="mx-auto max-w-5xl">
        <PortalLayoutShell portalKey="referrer">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
