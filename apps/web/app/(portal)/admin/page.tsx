'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';
import { metricsKeys } from '@/lib/query/keys';

const TENANT_ID = 'tenant-demo';

export default function AdminPortalPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: metrics } = useQuery({
    queryKey: metricsKeys.admin,
    queryFn: () => repos.metrics.getPlatformMetrics(userId),
    enabled: !!userId && status === 'authenticated',
  });

  const { data: payouts } = useQuery({
    queryKey: ['payouts', 'admin', TENANT_ID],
    queryFn: () => repos.payouts.listAll(TENANT_ID),
    enabled: status === 'authenticated',
  });

  const m = metrics ?? { totalEvents: 0, activeEvents: 0, ticketsSold: 0, totalReviews: 0, totalScans: 0 };
  const pendingPayouts = (payouts ?? []).filter(
    (p) => p.status === 'PENDING' || p.status === 'REQUESTED'
  );

  if (status === 'loading') return <PageContainer><p className="text-text-muted">Loading…</p></PageContainer>;
  if (!session?.user) return <PageContainer><p>Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Inicio', href: '/home' }, { label: 'Admin' }]} />
      <SectionTitle>Admin</SectionTitle>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card><CardContent><p className="text-sm text-text-muted">Eventos totales</p><p className="text-2xl font-bold">{m.totalEvents}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Eventos activos</p><p className="text-2xl font-bold">{m.activeEvents}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Tickets vendidos</p><p className="text-2xl font-bold">{m.ticketsSold}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Accesos validados</p><p className="text-2xl font-bold">{m.ticketsValidated ?? m.totalScans}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Tasa de uso</p><p className="text-2xl font-bold">{m.usageRatePercent ?? (m.ticketsSold > 0 ? Math.round((m.totalScans / m.ticketsSold) * 100) : 0)}%</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-text-muted">Reviews</p><p className="text-2xl font-bold">{m.totalReviews}</p></CardContent></Card>
      </div>

      {pendingPayouts.length > 0 && (
        <Card className="mt-6 border-accent/50">
          <CardContent className="pt-4">
            <p className="text-sm text-text-muted">Payouts pendientes</p>
            <p className="text-2xl font-bold text-accent">{pendingPayouts.length}</p>
            <Link
              href="/admin/payouts"
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Revisar y aprobar →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/admin/eventos" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">Eventos recientes</Link>
        <Link href="/admin/usuarios" className="rounded border border-border px-4 py-2 text-text hover:bg-bg-muted">Usuarios</Link>
        <Link href="/admin/aplicaciones" className="rounded border border-border px-4 py-2 text-text hover:bg-bg-muted">Solicitudes</Link>
        <Link href="/admin/audit" className="rounded border border-border px-4 py-2 text-text hover:bg-bg-muted">Audit logs</Link>
      </div>
    </PageContainer>
  );
}
