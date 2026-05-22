import type { TicketBatchResponse } from '@/repositories/interfaces';
import {
  pickActiveBatchPreview,
  pickNextBatchPreview,
  type BatchPreviewInput,
} from '@/lib/producer/ticket-batch-preview';

export type BatchDisplayPhase = 'upcoming' | 'active' | 'finished' | 'sold_out' | 'skipped';

export const BATCH_PHASE_LABELS: Record<BatchDisplayPhase, string> = {
  upcoming: 'Próxima',
  active: 'Activa',
  finished: 'Finalizada',
  sold_out: 'Agotada',
  skipped: 'Omitida',
};

export const BATCH_PHASE_BADGE_VARIANT: Record<
  BatchDisplayPhase,
  'default' | 'accent' | 'muted'
> = {
  upcoming: 'muted',
  active: 'accent',
  finished: 'muted',
  sold_out: 'muted',
  skipped: 'muted',
};

export function formatTicketPrice(value: string | number, currency = 'ARS'): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

export function batchToPreviewInput(b: TicketBatchResponse): BatchPreviewInput {
  return {
    orderIndex: b.orderIndex,
    status: b.status,
    startAt: b.startAt,
    endAt: b.endAt,
    effectiveQuantity: b.effectiveQuantity,
    soldCount: b.soldCount,
    reservedQuantity: b.reservedQuantity,
    name: b.name,
  };
}

export function getBatchDisplayPhase(
  batch: TicketBatchResponse,
  activeBatchId: string | null | undefined,
  allBatches: TicketBatchResponse[],
  now = new Date(),
): BatchDisplayPhase {
  if (batch.status === 'SKIPPED') return 'skipped';
  const end = new Date(batch.endAt).getTime();
  const start = new Date(batch.startAt).getTime();
  const rem =
    batch.effectiveQuantity - batch.soldCount - (batch.reservedQuantity ?? 0);

  if (batch.status === 'CLOSED' || now.getTime() > end) return 'finished';
  if (batch.status === 'SOLD_OUT' || rem <= 0) return 'sold_out';
  if (activeBatchId && batch.id === activeBatchId) return 'active';

  const previews = allBatches.map(batchToPreviewInput);
  const active = pickActiveBatchPreview(previews, now);
  if (active && active.orderIndex === batch.orderIndex) return 'active';

  if (now.getTime() < start) return 'upcoming';
  if (rem > 0 && batch.status === 'SCHEDULED') return 'upcoming';
  if (rem > 0 && batch.status === 'ACTIVE' && active?.orderIndex !== batch.orderIndex) {
    return 'upcoming';
  }
  if (rem <= 0) return 'sold_out';
  return 'finished';
}

export function getTicketTypeSoldCount(tt: {
  capacityTotal?: number;
  capacityAvailable?: number;
}): number {
  const capT = tt.capacityTotal ?? tt.capacityAvailable ?? 0;
  const capA = tt.capacityAvailable ?? 0;
  return Math.max(0, capT - capA);
}

export function getCurrentOrNextPrice(
  tt: {
    price: string | number;
    batches?: TicketBatchResponse[];
    activeTicketBatchId?: string | null;
  },
  now = new Date(),
): { label: string; amount: string } {
  const batches = [...(tt.batches ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  if (!batches.length) {
    return { label: 'Precio', amount: formatTicketPrice(tt.price) };
  }
  const activeId = tt.activeTicketBatchId;
  const active = activeId ? batches.find((b) => b.id === activeId) : null;
  const previews = batches.map(batchToPreviewInput);
  const activePreview = pickActiveBatchPreview(previews, now);
  const resolved =
    active ??
    (activePreview
      ? batches.find((b) => b.orderIndex === activePreview.orderIndex)
      : null);
  if (resolved) {
    return { label: 'Precio vigente', amount: formatTicketPrice(resolved.price, resolved.currency) };
  }
  const next = pickNextBatchPreview(previews, activePreview, now);
  if (next) {
    const nb = batches.find((b) => b.orderIndex === next.orderIndex);
    if (nb) {
      return {
        label: 'Próximo precio',
        amount: formatTicketPrice(nb.price, nb.currency),
      };
    }
  }
  const first = batches[0];
  return {
    label: 'Precio',
    amount: first ? formatTicketPrice(first.price, first.currency) : formatTicketPrice(tt.price),
  };
}

export type TicketTypeAlert = {
  id: string;
  tone: 'warning' | 'info';
  message: string;
};

export function getTicketTypeAlerts(tt: {
  status?: string;
  batches?: TicketBatchResponse[];
  ticketTemplateId?: string | null;
  capacityTotal?: number;
}): TicketTypeAlert[] {
  const alerts: TicketTypeAlert[] = [];
  const batches = tt.batches ?? [];

  if (!batches.length) {
    alerts.push({
      id: 'no-batches',
      tone: 'warning',
      message: 'Sin tandas configuradas: el checkout no podrá vender este tipo hasta que agregues al menos una tanda.',
    });
  }

  if (tt.status === 'PAUSED') {
    alerts.push({
      id: 'paused',
      tone: 'info',
      message: 'Tipo pausado: no se ofrece en checkout aunque las tandas estén activas.',
    });
  }

  if (!tt.ticketTemplateId) {
    alerts.push({
      id: 'no-template',
      tone: 'info',
      message: 'Sin diseño personalizado: el comprador verá el ticket predeterminado hasta que uses Ticket Studio.',
    });
  }

  const cap = tt.capacityTotal ?? 0;
  if (batches.length > 0 && cap > 0) {
    const sumBase = batches.reduce((a, b) => a + b.baseQuantity, 0);
    if (sumBase !== cap) {
      alerts.push({
        id: 'qty-mismatch',
        tone: 'warning',
        message: `La suma de cupos base en tandas (${sumBase}) no coincide con la capacidad del tipo (${cap}). Revisá al editar.`,
      });
    }
  }

  return alerts;
}
