'use client';

import { Role } from '@yo-te-invito/shared';
import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN]}>
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="admin">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
