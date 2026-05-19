import type { TicketTypeResponse } from '@/repositories/interfaces';
import { isoToDatetimeLocalInput } from '@/lib/producer/datetime-local';

export type BatchRowModel = {
  clientKey: string;
  orderIndex: number;
  name: string;
  startAt: string;
  endAt: string;
  baseQuantity: number;
  price: number;
};

export type TicketTypeEditForm = {
  name: string;
  description: string;
  capacityTotal: number;
  maxPerOrder: number;
  status: 'ACTIVE' | 'PAUSED';
  batches: BatchRowModel[];
};

export function newClientKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const p2 = (n: number) => String(n).padStart(2, '0');
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function emptyBatchTemplate(orderIndex: number): BatchRowModel {
  const start = new Date();
  const end = new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000);
  return {
    clientKey: newClientKey(),
    orderIndex,
    name: `Tanda ${orderIndex + 1}`,
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    baseQuantity: 10,
    price: 0,
  };
}

/** Next window after `prevEndAtLocal` (no overlap with previous tanda). */
export function emptyBatchTemplateAfter(prevEndAtLocal: string, orderIndex: number): BatchRowModel {
  const prevEnd = new Date(prevEndAtLocal);
  const start = Number.isNaN(prevEnd.getTime())
    ? new Date()
    : new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000);
  return {
    clientKey: newClientKey(),
    orderIndex,
    name: `Tanda ${orderIndex + 1}`,
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    baseQuantity: 10,
    price: 0,
  };
}

export function mapTicketTypeToEditForm(tt: TicketTypeResponse): TicketTypeEditForm {
  const capTotal = tt.capacityTotal ?? tt.capacityAvailable ?? 0;
  const bs = [...(tt.batches ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  if (bs.length === 0) {
    return {
      name: tt.name,
      description: (tt.description as string | null | undefined) ?? '',
      capacityTotal: capTotal,
      maxPerOrder: tt.maxPerOrder ?? 10,
      status: (tt.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE') as 'ACTIVE' | 'PAUSED',
      batches: [
        {
          clientKey: newClientKey(),
          orderIndex: 0,
          name: tt.name,
          startAt: tt.saleStart ? isoToDatetimeLocalInput(tt.saleStart) : '',
          endAt: tt.saleEnd ? isoToDatetimeLocalInput(tt.saleEnd) : '',
          baseQuantity: capTotal || 1,
          price: typeof tt.price === 'string' ? parseFloat(tt.price) : Number(tt.price) || 0,
        },
      ],
    };
  }

  return {
    name: tt.name,
    description: (tt.description as string | null | undefined) ?? '',
    capacityTotal: capTotal,
    maxPerOrder: tt.maxPerOrder ?? 10,
    status: (tt.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE') as 'ACTIVE' | 'PAUSED',
    batches: bs.map((b) => ({
      clientKey: b.id,
      orderIndex: b.orderIndex,
      name: b.name,
      startAt: isoToDatetimeLocalInput(b.startAt),
      endAt: isoToDatetimeLocalInput(b.endAt),
      baseQuantity: b.baseQuantity,
      price: typeof b.price === 'string' ? parseFloat(b.price) : Number(b.price) || 0,
    })),
  };
}

export function renumberBatches(batches: BatchRowModel[]): BatchRowModel[] {
  return batches.map((b, i) => ({ ...b, orderIndex: i }));
}
