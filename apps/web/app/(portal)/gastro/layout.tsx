'use client';

import { Suspense } from 'react';
import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { GastroActiveLocationProvider } from '@/lib/gastro/GastroActiveLocationContext';
import { Role } from '@yo-te-invito/shared';

function GastroLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <GastroActiveLocationProvider>
      <div className={PORTAL_BODY_CLASS}>
        <PortalLayoutShell portalKey="gastro">{children}</PortalLayoutShell>
      </div>
    </GastroActiveLocationProvider>
  );
}

export default function GastroLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.GASTRO_OWNER]} requiredProfile="gastro">
      <Suspense
        fallback={
          <div className={PORTAL_BODY_CLASS}>
            <p className="p-6 text-text-muted">Cargando…</p>
          </div>
        }
      >
        <GastroLayoutInner>{children}</GastroLayoutInner>
      </Suspense>
    </ProfileProtectedLayout>
  );
}
