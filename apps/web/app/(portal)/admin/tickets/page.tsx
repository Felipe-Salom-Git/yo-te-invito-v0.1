'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle } from '@/components';

export default function AdminTicketsPage() {
  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Tickets</SectionTitle>
      <p className="mt-4 text-text-muted">Intervenciones y auditoría de tickets.</p>
    </PageContainer>
  );
}
