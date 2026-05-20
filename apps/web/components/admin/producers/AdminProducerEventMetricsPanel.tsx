'use client';

import type { AdminProducerEventMetrics } from '@/repositories/interfaces';

type AdminProducerEventMetricsPanelProps = {
  metrics: AdminProducerEventMetrics | undefined;
  isLoading: boolean;
};

export function AdminProducerEventMetricsPanel({
  metrics,
  isLoading,
}: AdminProducerEventMetricsPanelProps) {
  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando métricas…</p>;
  }
  if (!metrics) return null;

  if (metrics.isGeneralPublication) {
    return (
      <div className="rounded-lg border border-border bg-bg-muted/50 p-4 text-sm">
        <p className="text-text-muted">
          Este evento fue creado como Solo Publicidad. No tiene venta de entradas.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <Metric label="Valoración promedio" value={metrics.ratingAvg?.toFixed(1) ?? '—'} />
          <Metric label="Reseñas" value={String(metrics.ratingCount ?? 0)} />
        </dl>
      </div>
    );
  }

  if (!metrics.hasTicketing) {
    return (
      <div className="rounded-lg border border-border bg-bg-muted/50 p-4 text-sm">
        <p className="text-text-muted">
          Este evento no tiene ticketera activa. Las métricas de ventas no aplican.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <Metric label="Valoración promedio" value={metrics.ratingAvg?.toFixed(1) ?? '—'} />
          <Metric label="Reseñas" value={String(metrics.ratingCount ?? 0)} />
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-muted/50 p-4 text-sm">
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Tipos de entrada" value={String(metrics.ticketTypesCount)} />
        <Metric label="Entradas vendidas" value={String(metrics.ticketsSold)} />
        <Metric label="Disponibles" value={String(metrics.ticketsAvailable)} />
        <Metric label="Ingresos brutos" value={`${metrics.currency} ${metrics.revenue}`} />
        <Metric label="Órdenes pagadas" value={String(metrics.paidOrdersCount)} />
        <Metric label="Órdenes pendientes" value={String(metrics.pendingOrdersCount)} />
        <Metric label="Órdenes expiradas" value={String(metrics.expiredOrdersCount)} />
        <Metric label="Escaneos OK" value={String(metrics.scanCount)} />
        <Metric label="Cortesías" value={String(metrics.courtesyCount)} />
        {metrics.attendanceRatePercent != null && (
          <Metric label="Asistencia" value={`${metrics.attendanceRatePercent}%`} />
        )}
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}
