'use client';

import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { Role } from '@yo-te-invito/shared';

const NAV = [
  { href: '/producer', label: 'Dashboard' },
  { href: '/producer/events', label: 'Eventos' },
  { href: '/producer/referrals', label: 'Referidos' },
  { href: '/producer/payouts', label: 'Payouts' },
];

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout allowedRoles={[Role.PRODUCER_OWNER, Role.PRODUCER_STAFF]}>
      <div className="mx-auto max-w-5xl">
        <PortalSidebar items={NAV}>{children}</PortalSidebar>
      </div>
    </ProtectedLayout>
  );
}
