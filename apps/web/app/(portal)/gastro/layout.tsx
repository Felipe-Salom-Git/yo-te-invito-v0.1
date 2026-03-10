'use client';

import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { Role } from '@yo-te-invito/shared';

const NAV = [
  { href: '/gastro', label: 'Dashboard' },
  { href: '/gastro/contenido', label: 'Contenido' },
  { href: '/gastro/descuentos', label: 'Descuentos' },
  { href: '/gastro/validaciones', label: 'Resumen descuentos' },
  { href: '/gastro/valoraciones', label: 'Valoraciones' },
];

export default function GastroLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout allowedRoles={[Role.GASTRO_OWNER]}>
      <div className="mx-auto max-w-5xl">
        <PortalSidebar items={NAV}>{children}</PortalSidebar>
      </div>
    </ProtectedLayout>
  );
}
