'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { Role } from '@yo-te-invito/shared';

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.HOTEL_OWNER]} requiredProfile="hotel">
      <div className="mx-auto max-w-5xl">
        <PortalLayoutShell portalKey="hotel">{children}</PortalLayoutShell>
      </div>
    </ProfileProtectedLayout>
  );
}
