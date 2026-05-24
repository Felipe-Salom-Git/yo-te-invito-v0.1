'use client';

import { Role } from '@yo-te-invito/shared';
import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-5xl px-3 sm:px-4">
        <PortalLayoutShell portalKey="admin">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
