'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  QueryError,
} from '@/components';
import { useRepositories } from '@/repositories/context';
import { useAdminDashboard } from '@/lib/query/admin-dashboard';
import { payoutsKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import { AdminDashboardKpiCard } from './AdminDashboardKpiCard';
import { AdminPendingEventsQueue } from './AdminPendingEventsQueue';
import { AdminOperationalLinks } from './AdminOperationalLinks';
import { AdminVerticalStatusCard } from './AdminVerticalStatusCard';

const TENANT_ID = 'tenant-demo';

function kpiValue(n: number | undefined): string | number {
  if (n === undefined) return '—';
  return n;
}

export function AdminDashboardClient() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const dashboardQuery = useAdminDashboard(status === 'authenticated');

  const payoutsQuery = useQuery({
    queryKey: payoutsKeys.all,
    queryFn: () => repos.payouts.listAll(TENANT_ID),
    enabled: status === 'authenticated',
  });

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando administración…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión como administrador.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  const metrics = dashboardQuery.data?.metrics;
  const pendingEvents = dashboardQuery.data?.pendingEvents ?? [];
  const pendingPayouts = (payoutsQuery.data ?? []).filter(
    (p) => p.status === 'PENDING' || p.status === 'REQUESTED',
  );

  const pendingCount = metrics?.pendingEvents ?? 0;

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionTitle>Administración</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Controlá eventos, usuarios, aprobaciones y actividad de la plataforma.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/admin/eventos?view=pending">
            <Button>
              {pendingCount > 0
                ? `Pendientes (${pendingCount})`
                : 'Gestionar eventos'}
            </Button>
          </Link>
          <Link href="#cola-pendientes">
            <Button variant="outline">Cola en dashboard</Button>
          </Link>
        </div>
      </header>

      {dashboardQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(dashboardQuery.error)}
          onRetry={() => dashboardQuery.refetch()}
        />
      ) : null}

      <section className="mt-8" aria-label="Indicadores operativos">
        <h2 className="sr-only">KPIs operativos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AdminDashboardKpiCard
            label="Pendientes de aprobación"
            value={kpiValue(metrics?.pendingEvents)}
            hint="Eventos en estado pendiente"
          />
          <AdminDashboardKpiCard
            label="Eventos activos"
            value={kpiValue(metrics?.activeEvents)}
            hint="Aprobados con fecha futura"
          />
          <AdminDashboardKpiCard
            label="Usuarios registrados"
            value={kpiValue(metrics?.registeredUsers)}
          />
          <AdminDashboardKpiCard
            label="Productoras activas"
            value={kpiValue(metrics?.activeProducers)}
          />
          <AdminDashboardKpiCard
            label="Disputas abiertas"
            value={kpiValue(metrics?.pendingDisputes)}
            hint="Reseñas en cola admin"
          />
          <AdminDashboardKpiCard
            label="Tickets vendidos"
            value={
              metrics?.ticketsSold !== undefined
                ? metrics.ticketsSold
                : '—'
            }
            hint={
              metrics?.ticketsSold !== undefined
                ? 'Datos reales de ventas demo'
                : 'No disponible'
            }
            unavailable={metrics?.ticketsSold === undefined}
          />
        </div>
        {metrics?.totalReviews !== undefined ? (
          <p className="mt-3 text-xs text-text-muted">
            Reseñas en plataforma: {metrics.totalReviews}
            {pendingPayouts.length > 0 ? (
              <>
                {' '}
                · Payouts pendientes:{' '}
                <Link href="/admin/payouts" className="text-accent hover:underline">
                  {pendingPayouts.length}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </section>

      <section id="cola-pendientes" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Cola de eventos pendientes</h2>
            <p className="mt-1 text-sm text-text-muted">
              Aprobá o rechazá desde la ficha de la productora (flujo existente). Slice 2: acciones
              rápidas en esta cola si hace falta.
            </p>
          </div>
          <Link
            href="/admin/eventos?view=pending"
            className="text-sm font-medium text-accent hover:underline"
          >
            Ver todos los pendientes →
          </Link>
        </div>
        <AdminPendingEventsQueue
          events={pendingEvents}
          isLoading={dashboardQuery.isLoading}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Verticales</h2>
        <p className="mt-1 text-sm text-text-muted">
          Estado operativo por categoría. Hoteles no está activo en V2.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminVerticalStatusCard
            title="Eventos"
            description="Productoras, publicaciones y ticketera."
            href="/admin/productoras"
          />
          <AdminVerticalStatusCard
            title="Gastronomía"
            description="Locales, descuentos y publicaciones."
            href="/admin/gastronomicos"
          />
          <AdminVerticalStatusCard
            title="Excursiones"
            description="Operadores y excursiones."
            href="/admin/excursiones"
          />
          <AdminVerticalStatusCard
            title="Rentals"
            description="Locales y productos de alquiler."
            href="/admin/rentals"
          />
          <AdminVerticalStatusCard
            title="Hoteles"
            description="Vertical de alojamiento — no operativa en V2."
            comingSoon
          />
        </div>
      </section>

      <div className="mt-10">
        <AdminOperationalLinks />
      </div>
    </PageContainer>
  );
}
