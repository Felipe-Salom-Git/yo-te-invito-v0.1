'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GASTRO_WEEKDAY_LABELS_ES,
  classifyGastroDiscountLifecycle,
  type GastroDiscountLifecycleBucket,
  type GastroWeekday,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';
import { formatGastroDiscountValidityRangeLabel, gastroDiscountPortalStatusLabel } from '@/lib/gastro/discount-status-ui';

const TABS: Array<{ id: GastroDiscountLifecycleBucket; label: string }> = [
  { id: 'ACTIVE', label: 'Activos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'FINISHED', label: 'Vencidos / finalizados' },
  { id: 'ARCHIVED', label: 'Archivados' },
];

export default function GastroDescuentosPage() {
  const repos = useRepositories();
  const { profileId } = useGastroActiveLocation();
  const [tab, setTab] = useState<GastroDiscountLifecycleBucket>('ACTIVE');
  const { data, isLoading } = useQuery({
    queryKey: gastroKeys.discounts(profileId),
    queryFn: () => repos.gastro.listMyDiscounts(profileId),
  });

  const discounts = data?.data ?? [];
  const grouped = useMemo(() => {
    const buckets: Record<GastroDiscountLifecycleBucket, typeof discounts> = {
      ACTIVE: [],
      PENDING: [],
      FINISHED: [],
      ARCHIVED: [],
    };
    for (const d of discounts) {
      const bucket = classifyGastroDiscountLifecycle({
        status: d.status,
        archivedAt: d.archivedAt,
        validityMode: d.validityMode,
        validTo: d.validTo,
        discountDate: d.discountDate,
        hasPendingUpdate: Boolean(d.hasPendingUpdate),
      });
      buckets[bucket].push(d);
    }
    return buckets;
  }, [discounts]);

  const visible = grouped[tab];

  return (
    <PageContainer>
      <div className="mb-4">
        <GastroLocationSelector />
      </div>
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
            href={`/gastro/descuentos/nuevo${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Nuevo ticket
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-text-muted">
        Los tickets se envían a revisión. Administración coordinará la comisión antes de activarlos.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === t.id
                ? 'bg-accent text-bg'
                : 'border border-border text-text-muted hover:border-accent/50'
            }`}
          >
            {t.label} ({grouped[t.id].length})
          </button>
        ))}
      </div>
      {isLoading && <p className="text-text-muted">Cargando…</p>}
      {!isLoading && visible.length === 0 && (
        <p className="text-text-muted">No hay tickets en esta sección.</p>
      )}
      <ul className="space-y-3">
        {visible.map((d) => (
          <li key={d.id}>
            <Link
              href={`/gastro/descuentos/${d.id}${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`}
              className="block rounded-lg border border-border p-4 transition hover:border-accent/50 hover:bg-bg-muted/30"
            >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{d.title ?? d.code}</p>
                <p className="text-sm text-text-muted">{d.summary}</p>
                {d.hasPendingUpdate && (
                  <p className="mt-1 text-xs text-amber-300">Edición pendiente de revisión</p>
                )}
                {d.validityMode === 'WEEKLY_RECURRING' && d.validWeekday ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Todos los {GASTRO_WEEKDAY_LABELS_ES[d.validWeekday as GastroWeekday]}
                  </p>
                ) : (
                  (() => {
                    const range = formatGastroDiscountValidityRangeLabel(
                      d.validFrom,
                      d.validTo,
                      d.discountDate,
                    );
                    return range ? (
                      <p className="mt-1 text-xs text-text-muted">Vigencia: {range}</p>
                    ) : null;
                  })()
                )}
              </div>
              <span className="rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text">
                {gastroDiscountPortalStatusLabel({
                  status: d.status,
                  archivedAt: d.archivedAt,
                })}
              </span>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
