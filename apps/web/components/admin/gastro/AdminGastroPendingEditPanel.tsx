'use client';

import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from '@yo-te-invito/shared';
import { Button } from '@/components';
import type { AdminGastroDiscountDetail } from '@/repositories/interfaces';

type Props = {
  discount: AdminGastroDiscountDetail;
  note: string;
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
};

function formatOffer(type?: string | null, value?: number | null): string {
  if (type == null && (value == null || Number.isNaN(value))) return '—';
  const n = value ?? 0;
  if (type === 'FIXED') return `$${n} OFF`;
  return `${n}%`;
}

function FieldDiff({
  label,
  current,
  proposed,
}: {
  label: string;
  current: string;
  proposed: string;
}) {
  const changed = current !== proposed;
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label} actual</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{current || '—'}</p>
      </div>
      <div className={changed ? 'rounded-md bg-accent/10 p-2' : ''}>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label} propuesto
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{proposed || '—'}</p>
      </div>
    </div>
  );
}

function validityLabel(input: {
  validityMode?: string | null;
  validWeekday?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  discountDate?: string | null;
}): string {
  if (input.validityMode === 'WEEKLY_RECURRING' && input.validWeekday) {
    return `Todos los ${GASTRO_WEEKDAY_LABELS_ES[input.validWeekday as GastroWeekday]}`;
  }
  const from = input.validFrom ?? input.discountDate;
  const to = input.validTo ?? input.discountDate;
  if (!from && !to) return '—';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  if (from && to && from !== to) return `${fmt(from)} → ${fmt(to)}`;
  return fmt(from ?? to!);
}

export function AdminGastroPendingEditPanel({
  discount,
  note,
  pending,
  onApprove,
  onReject,
}: Props) {
  const proposed = discount.pendingUpdate;
  if (!proposed) return null;

  return (
    <section className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <h3 className="text-sm font-semibold">Edición pendiente de revisión</h3>
      <p className="mt-1 text-sm text-text-muted">
        La versión publicada sigue activa para discovery, QR y claims. Compará y aprobá o
        descartá los cambios.
      </p>
      {discount.pendingUpdateSubmittedAt && (
        <p className="mt-1 text-xs text-text-muted">
          Enviada: {new Date(discount.pendingUpdateSubmittedAt).toLocaleString('es-AR')}
        </p>
      )}
      <div className="mt-4 space-y-4">
        <FieldDiff label="Título" current={discount.title ?? ''} proposed={proposed.title} />
        <FieldDiff label="Resumen" current={discount.summary ?? ''} proposed={proposed.summary} />
        <FieldDiff label="Detalle" current={discount.detail ?? ''} proposed={proposed.detail} />
        <FieldDiff
          label="Oferta"
          current={formatOffer(discount.type, discount.value)}
          proposed={formatOffer(proposed.type, proposed.value)}
        />
        <FieldDiff
          label="Vigencia"
          current={validityLabel(discount)}
          proposed={validityLabel(proposed)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Imágenes actuales
            </p>
            <p className="text-sm">{discount.submittedImageUrls.length} archivo(s)</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Imágenes propuestas
            </p>
            <p className="text-sm">{proposed.imageUrls.length} archivo(s)</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={onApprove}>
          Aprobar edición
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onReject}>
          Rechazar edición
        </Button>
      </div>
      {note ? null : (
        <p className="mt-2 text-xs text-text-muted">
          Podés dejar una nota interna arriba antes de rechazar.
        </p>
      )}
    </section>
  );
}
