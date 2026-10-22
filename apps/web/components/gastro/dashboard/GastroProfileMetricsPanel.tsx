'use client';

import type { GastroProfileMetricsResponse } from '@yo-te-invito/shared';
import { ProducerKpiCard } from '@/components/producer/dashboard/ProducerKpiCard';

type Props = {
  metrics: GastroProfileMetricsResponse;
};

export function GastroProfileMetricsPanel({ metrics }: Props) {
  const maxDay = Math.max(1, ...metrics.viewsByDay.map((d) => d.views));

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Métricas del local
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Visualizaciones de la ficha pública · timezone {metrics.timezone}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProducerKpiCard label="Vistas totales" value={metrics.totalViews} />
        <ProducerKpiCard label="Hoy" value={metrics.viewsToday} />
        <ProducerKpiCard label="Últimos 7 días" value={metrics.viewsLast7Days} />
        <ProducerKpiCard label="Últimos 30 días" value={metrics.viewsLast30Days} />
      </div>
      {(metrics.activeDiscounts != null ||
        metrics.totalClaims != null ||
        metrics.totalValidations != null) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {metrics.activeDiscounts != null ? (
            <ProducerKpiCard label="Descuentos activos" value={metrics.activeDiscounts} />
          ) : null}
          {metrics.totalClaims != null ? (
            <ProducerKpiCard label="Claims" value={metrics.totalClaims} />
          ) : null}
          {metrics.totalValidations != null ? (
            <ProducerKpiCard label="Validaciones" value={metrics.totalValidations} />
          ) : null}
        </div>
      )}
      <div className="mt-6 rounded-xl border border-border bg-bg-muted/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Vistas por día (30 días)
        </p>
        <div
          className="mt-4 flex h-28 items-end gap-0.5"
          role="img"
          aria-label="Gráfico de vistas diarias"
        >
          {metrics.viewsByDay.map((day) => {
            const h = Math.round((day.views / maxDay) * 100);
            return (
              <div
                key={day.date}
                className="flex min-w-0 flex-1 flex-col items-center justify-end"
                title={`${day.date}: ${day.views}`}
              >
                <div
                  className="w-full rounded-t bg-accent/70"
                  style={{ height: `${Math.max(day.views > 0 ? 8 : 2, h)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
