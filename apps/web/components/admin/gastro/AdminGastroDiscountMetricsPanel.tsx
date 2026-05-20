'use client';

import type { AdminGastroDiscountMetrics } from '@/repositories/interfaces';
import { AdminGastroDiscountStatusBadge } from './AdminGastroDiscountStatusBadge';

type Props = {
  metrics: AdminGastroDiscountMetrics | undefined;
  isLoading: boolean;
};

export function AdminGastroDiscountMetricsPanel({ metrics, isLoading }: Props) {
  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando métricas…</p>;
  }
  if (!metrics) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-muted/50 p-4 text-sm">
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-text-muted">Estado</dt>
          <dd className="mt-1">
            <AdminGastroDiscountStatusBadge status={metrics.status} />
          </dd>
        </div>
        <Metric
          label="Validaciones QR"
          value={String(metrics.validationCount)}
        />
        <Metric
          label="Fecha del descuento"
          value={
            metrics.discountDate
              ? new Date(metrics.discountDate).toLocaleDateString('es-AR')
              : '—'
          }
        />
        <Metric
          label="Email QR enviado"
          value={
            metrics.emailSentAt
              ? new Date(metrics.emailSentAt).toLocaleString('es-AR')
              : '—'
          }
        />
        <Metric
          label="Última validación"
          value={
            metrics.lastValidationAt
              ? new Date(metrics.lastValidationAt).toLocaleString('es-AR')
              : '—'
          }
        />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-text">{value}</dd>
    </div>
  );
}
