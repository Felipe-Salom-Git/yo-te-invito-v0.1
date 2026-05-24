'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
} from '@/components';
import { ProducerKpiCard } from '@/components/producer/dashboard/ProducerKpiCard';
import { GastroOnboardingChecklist } from '@/components/onboarding/GastroOnboardingChecklist';
import { ManagedPortalReviewAlerts } from '@/components/reviews/ManagedPortalReviewAlerts';
import { useGastroDashboard } from '@/lib/query/gastro-dashboard';
import { getErrorMessage } from '@/lib/errors';
import type { GastroDashboardAlert } from '@/repositories/interfaces';

const SCANNER_APP_URL =
  process.env.NEXT_PUBLIC_SCANNER_APP_URL ?? 'http://localhost:3002/door';

const ALERT_COPY: Record<
  GastroDashboardAlert,
  { title: string; href: string; label: string }
> = {
  EXPIRED_DISCOUNTS: {
    title: 'Hay descuentos vencidos o con fecha pasada.',
    href: '/gastro/descuentos',
    label: 'Ver descuentos',
  },
  INACTIVE_DISCOUNTS: {
    title: 'Hay descuentos pendientes de revisión o inactivos.',
    href: '/gastro/descuentos',
    label: 'Revisar descuentos',
  },
  MISSING_PUBLIC_CONTENT: {
    title: 'No hay contenido publicado en tu ficha pública.',
    href: '/gastro/contenido',
    label: 'Cargar contenido',
  },
  MISSING_MAIN_IMAGE: {
    title: 'Falta imagen principal (logo o banner) en tu local.',
    href: '/gastro/local',
    label: 'Editar local',
  },
};

const QUICK_LINKS = [
  { href: '/gastro/contenido', label: 'Contenido' },
  { href: '/gastro/descuentos', label: 'Descuentos' },
  { href: '/gastro/validaciones', label: 'Resumen descuentos' },
  { href: '/gastro/valoraciones', label: 'Valoraciones' },
] as const;

function displayNameFromSession(user: {
  name?: string | null;
  email?: string | null;
}): string | null {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  const email = user.email?.trim();
  if (email) return email.split('@')[0] ?? null;
  return null;
}

export function GastroDashboardClient() {
  const { data: session, status } = useSession();
  const dashboardQuery = useGastroDashboard(status === 'authenticated');
  const data = dashboardQuery.data;

  const greeting = useMemo(() => {
    const first = session?.user ? displayNameFromSession(session.user) : null;
    const local = data?.profile.displayName?.trim();
    if (local) return `Hola, ${local}`;
    if (first) return `Hola, ${first}`;
    return 'Portal gastronómico';
  }, [session?.user, data?.profile.displayName]);

  if (status === 'loading' || dashboardQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando dashboard…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para continuar.</p>
        <Link href="/login" className="mt-2 inline-block text-accent hover:underline">
          Login
        </Link>
      </PageContainer>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <PageContainer>
        <QueryError message={getErrorMessage(dashboardQuery.error)} onRetry={() => dashboardQuery.refetch()} />
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <EmptyState title="Sin datos" description="No pudimos cargar el resumen del local." />
      </PageContainer>
    );
  }

  const { profile, kpis, alerts, recentValidations } = data;
  const reviewsPending =
    kpis.reviewsPendingReply != null ? kpis.reviewsPendingReply : '—';

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>

      <header className="border-b border-border/60 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Portal gastro</p>
        <h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{greeting}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {profile.status
            ? `Perfil ${profile.status.toLowerCase()}`
            : 'Sin perfil activo'}
          {profile.publishedContentCount > 0
            ? ` · ${profile.publishedContentCount} contenido(s) publicado(s)`
            : ' · Sin contenido publicado'}
        </p>
      </header>

      <GastroOnboardingChecklist />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Indicadores</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProducerKpiCard label="Descuentos activos" value={kpis.activeDiscounts} />
          <ProducerKpiCard label="Validaciones totales" value={kpis.totalValidations} />
          <ProducerKpiCard
            label="Validaciones (7 días)"
            value={kpis.validationsLast7Days}
            hint="Escaneos en puerta"
          />
          <ProducerKpiCard
            label="Valoraciones sin responder"
            value={reviewsPending}
            unavailable={kpis.reviewsPendingReply == null}
            hint={
              kpis.reviewsPendingReply != null && kpis.reviewsPendingReply > 0
                ? 'Requieren réplica'
                : undefined
            }
          />
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold text-amber-200">Alertas operativas</h2>
          <ul className="mt-3 space-y-2">
            {alerts.map((code) => {
              const copy = ALERT_COPY[code];
              return (
                <li
                  key={code}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm text-text">{copy.title}</span>
                  <Link href={copy.href} className="text-sm font-medium text-accent hover:underline">
                    {copy.label} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ManagedPortalReviewAlerts
        enabled={status === 'authenticated'}
        heading="Novedades de valoraciones"
        defaultHref="/gastro/valoraciones"
      />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Accesos</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/15"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/gastro/local"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:border-accent/40"
          >
            Mi local
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border/80 bg-bg-muted/40 p-4">
        <h2 className="text-sm font-semibold text-text">Scanner en puerta</h2>
        <p className="mt-1 text-sm text-text-muted">
          Validá descuentos con la PWA (requiere conexión). Los tickets siguen usando el flujo de
          entradas.
        </p>
        <a
          href={SCANNER_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Abrir PWA Scanner
        </a>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Validaciones recientes
          </h2>
          <Link href="/gastro/validaciones" className="text-sm text-accent hover:underline">
            Ver todo
          </Link>
        </div>
        {recentValidations.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Aún no hay validaciones registradas.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentValidations.map((v) => (
              <li
                key={v.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{v.discountTitle}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(v.validatedAt).toLocaleString('es-AR')}
                  </p>
                </div>
                <Link
                  href={`/gastro/descuentos`}
                  className="text-xs text-accent hover:underline"
                >
                  Ver descuentos
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
