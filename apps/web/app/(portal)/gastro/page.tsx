'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function GastroPortalPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 10 }),
    enabled: status === 'authenticated',
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['gastroValidations'],
    queryFn: () => repos.gastro.listValidations(),
    enabled: status === 'authenticated',
  });

  const firstEventId = eventsData?.data?.[0]?.id;
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', 'gastro-dash', firstEventId],
    queryFn: () => repos.reviews.list(firstEventId!, TENANT_ID, 1, 1),
    enabled: status === 'authenticated' && !!firstEventId,
  });

  const events = eventsData?.data ?? [];
  const reviewCount = reviewsData?.total ?? 0;

  if (status === 'loading') return <PageContainer><p className="text-text-muted">Loading…</p></PageContainer>;
  if (!session?.user) return <PageContainer><p>Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">← Volver</Link>
      <SectionTitle>Portal Gastro</SectionTitle>
      <p className="mt-4 text-text-muted">Gestioná tu local, tickets de descuento y resumen de uso.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-text-muted">Establecimientos en catálogo</p>
            <p className="text-2xl font-bold text-text">{events.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-text-muted">Usos de descuentos</p>
            <p className="text-2xl font-bold text-text">{validations.length}</p>
            <Link href="/gastro/validaciones" className="mt-1 inline-block text-xs text-accent hover:underline">
              Ver resumen
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-text-muted">Valoraciones (primer local)</p>
            <p className="text-2xl font-bold text-text">{firstEventId ? reviewCount : '—'}</p>
            <Link href="/gastro/valoraciones" className="mt-1 inline-block text-xs text-accent hover:underline">
              Ver todas
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/gastro/local" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Mi local
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
