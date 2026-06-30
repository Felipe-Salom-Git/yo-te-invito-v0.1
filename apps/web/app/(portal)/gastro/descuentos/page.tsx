'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { gastroKeys } from '@/lib/query/keys';
import type { GastroDiscountStatus } from '@/repositories/interfaces';

const STATUS_LABEL: Record<GastroDiscountStatus, string> = {
  PENDING_REVIEW: 'En revisión',
  COMMISSION_NEGOTIATION: 'Coordinación comisión',
  APPROVED: 'Aprobado',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

export default function GastroDescuentosPage() {
  const repos = useRepositories();
  const { data, isLoading } = useQuery({
    queryKey: gastroKeys.discounts(),
    queryFn: () => repos.gastro.listMyDiscounts(),
  });

  const discounts = data?.data ?? [];

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Tickets de descuento</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gastro/descuentos/cortesia"
            className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
          >
            Enviar cortesías
          </Link>
          <Link
            href="/gastro/descuentos/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Nuevo ticket
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-text-muted">
        Los tickets se envían a revisión. Administración coordinará la comisión antes de activarlos.
      </p>
      {isLoading && <p className="text-text-muted">Cargando…</p>}
      {!isLoading && discounts.length === 0 && (
        <p className="text-text-muted">Todavía no creaste tickets de descuento.</p>
      )}
      <ul className="space-y-3">
        {discounts.map((d) => (
          <li key={d.id}>
            <Link
              href={`/gastro/descuentos/${d.id}`}
              className="block rounded-lg border border-border p-4 transition hover:border-accent/50 hover:bg-bg-muted/30"
            >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{d.title ?? d.code}</p>
                <p className="text-sm text-text-muted">{d.summary}</p>
                {d.validityMode === 'WEEKLY_RECURRING' && d.validWeekday ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Todos los {GASTRO_WEEKDAY_LABELS_ES[d.validWeekday as GastroWeekday]}
                  </p>
                ) : d.discountDate ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Fecha: {new Date(d.discountDate).toLocaleDateString('es-AR')}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text">
                {STATUS_LABEL[d.status]}
              </span>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
