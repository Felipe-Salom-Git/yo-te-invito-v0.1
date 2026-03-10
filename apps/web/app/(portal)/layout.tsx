'use client';

import { ProtectedLayout } from '@/components/auth/ProtectedLayout';

/** Portal: any authenticated user. Add allowedRoles to restrict by role. */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
