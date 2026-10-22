'use client';

import type { GastroDiscountOperationalMetricsResponse } from '@yo-te-invito/shared';
import { ProducerKpiCard } from '@/components/producer/dashboard/ProducerKpiCard';

type Props = {
  metrics: GastroDiscountOperationalMetricsResponse;
};

export function GastroDiscountOperationalMetricsPanel({ metrics }: Props) {
  const maxDay = Math.max(
    1,
    ...metrics.activityByDay.map((d) => Math.max(d.claims, d.validations)),
  );

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Métricas del descuento
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Claims y validaciones · timezone {metrics.timezone}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProducerKpiCard label="Claims emitidos" value={metrics.claims} />
        <ProducerKpiCard label="Disponibles" value={metrics.availableClaims} />
        <ProducerKpiCard label="Usados" value={metrics.usageCount} />
        <ProducerKpiCard label="Validaciones QR" value={metrics.validations} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-text-muted">Última validación</p>
          <p className="mt-0.5 font-medium text-text">
            {metrics.lastValidationAt
              ? new Date(metrics.lastValidationAt).toLocaleString('es-AR')
              : '—'}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-text-muted">QR generado</p>
          <p className="mt-0.5 font-medium text-text">
            {metrics.hasQrToken
              ? metrics.qrGeneratedAt
                ? new Date(metrics.qrGeneratedAt).toLocaleString('es-AR')
                : 'Sí'
              : 'No'}
          </p>
        </div>
      </div>
      {metrics.activityByDay.length > 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Actividad por día (30 días)
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            Barras: claims · línea base: validaciones (altura relativa)
          </p>
          <div
            className="mt-4 flex h-28 items-end gap-0.5"
            role="img"
            aria-label="Gráfico de claims y validaciones diarias"
          >
            {metrics.activityByDay.map((day) => {
              const claimsH = Math.round((day.claims / maxDay) * 100);
              const valsH = Math.round((day.validations / maxDay) * 100);
              return (
                <div
                  key={day.date}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                  title={`${day.date}: ${day.claims} claims, ${day.validations} validaciones`}
                >
                  <div
                    className="w-full rounded-t bg-accent/70"
                    style={{ height: `${Math.max(day.claims > 0 ? 6 : 2, claimsH)}%` }}
                  />
                  <div
                    className="w-full rounded-t bg-text-muted/40"
                    style={{ height: `${Math.max(day.validations > 0 ? 4 : 1, valsH * 0.5)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {metrics.recentValidations.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Validaciones recientes
          </p>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
            {metrics.recentValidations.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="font-mono text-xs text-text">
                  {v.shortCode ?? v.claimId ?? v.id.slice(0, 8)}
                </span>
                <span className="text-text-muted">
                  {new Date(v.validatedAt).toLocaleString('es-AR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
