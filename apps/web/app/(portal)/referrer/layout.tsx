'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { Role } from '@yo-te-invito/shared';

const NAV = [
  { href: '/referrer', label: 'Dashboard' },
  { href: '/referrer/eventos', label: 'Eventos' },
  { href: '/referrer/configuracion', label: 'Configuración' },
];

export default function ReferrerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.REFERRER]} requiredProfile="referrer">
      <div className="mx-auto max-w-5xl">
        <PortalSidebar items={NAV}>{children}</PortalSidebar>
      </div>
    </ProfileProtectedLayout>
  );
}
