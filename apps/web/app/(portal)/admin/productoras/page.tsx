'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle } from '@/components';

export default function AdminProductorasPage() {
  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Productoras</SectionTitle>
      <p className="mt-4 text-text-muted">Gestión de productoras.</p>
    </PageContainer>
  );
}
