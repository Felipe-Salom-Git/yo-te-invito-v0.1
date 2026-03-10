'use client';

import { PortalSidebar } from '@/components/layout/PortalSidebar';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/eventos', label: 'Eventos' },
  { href: '/admin/excursiones', label: 'Excursiones' },
  { href: '/admin/rentals', label: 'Rentals' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/productoras', label: 'Productoras' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/configuracion', label: 'Configuración' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4">
      <PortalSidebar items={NAV}>{children}</PortalSidebar>
    </div>
  );
}
