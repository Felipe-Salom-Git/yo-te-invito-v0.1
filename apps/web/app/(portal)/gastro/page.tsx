'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function GastroPortalPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 10 }),
    enabled: status === 'authenticated',
  });

  const events = eventsData?.data ?? [];

  if (status === 'loading') return <PageContainer><p className="text-text-muted">Loading…</p></PageContainer>;
  if (!session?.user) return <PageContainer><p>Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">← Volver</Link>
      <SectionTitle>Portal Gastro</SectionTitle>
      <p className="mt-4 text-text-muted">Editor de contenido, descuentos y resumen.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/gastro/contenido" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Contenido
        </Link>
        <Link href="/gastro/descuentos" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Descuentos
        </Link>
        <Link href="/gastro/validaciones" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Resumen descuentos
        </Link>
        <Link href="/gastro/valoraciones" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Valoraciones
        </Link>
      </div>
      <div className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
        <p className="text-sm font-medium text-text">PWA Scanner</p>
        <p className="mt-1 text-sm text-text-muted">
          Descargá la app del scanner para validar descuentos en puerta.
        </p>
        <a
          href="/dev/scanner-sim"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Descargar / Abrir PWA Scanner
        </a>
      </div>
      <p className="mt-6 text-sm text-text-muted">
        {events.length} evento(s) gastro en catálogo.
      </p>
    </PageContainer>
  );
}
