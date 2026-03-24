'use client';

import { ProfileProtectedLayout } from '@/components/auth/ProfileProtectedLayout';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { Role } from '@yo-te-invito/shared';

const NAV = [
  { href: '/producer', label: 'Dashboard' },
  { href: '/producer/profile', label: 'Perfil' },
  { href: '/producer/events', label: 'Eventos' },
  { href: '/producer/referrals', label: 'Referidos' },
  { href: '/producer/payouts', label: 'Payouts' },
];

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProtectedLayout allowedRoles={[Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF]} requiredProfile="producer">
      <div className="mx-auto max-w-5xl">
        <PortalSidebar items={NAV}>{children}</PortalSidebar>
      </div>
    </ProfileProtectedLayout>
  );
}
