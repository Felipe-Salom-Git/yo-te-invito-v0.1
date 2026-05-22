'use client';

import { Role } from '@yo-te-invito/shared';
import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalSidebar } from '@/components/layout/PortalSidebar';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/review-disputes', label: 'Reseñas (disputas)' },
  { href: '/admin/productoras', label: 'Productoras' },
  { href: '/admin/publicaciones-generales', label: 'Publicaciones Generales' },
  { href: '/admin/gastronomicos', label: 'Gastronómicos' },
  { href: '/admin/excursiones', label: 'Excursiones' },
  { href: '/admin/rentals', label: 'Rentals' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/contactos', label: 'Contactos' },
  { href: '/admin/categorias', label: 'Categorías' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-5xl px-3 sm:px-4">
        <PortalSidebar items={NAV}>{children}</PortalSidebar>
      </div>
    </ProfileProtectedLayout>
  );
}
