'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { Role } from '@yo-te-invito/shared';

export default function GastroLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.GASTRO_OWNER]} requiredProfile="gastro">
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="gastro">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
