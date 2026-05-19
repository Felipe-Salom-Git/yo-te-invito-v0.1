/**
 * Client-side validation for producer ticket type + batches forms.
 */

import { renumberBatches, type TicketTypeEditForm } from '@/lib/producer/ticket-types-editor.model';

export type BatchDraftForValidation = {
  name: string;
  startAt: string;
  endAt: string;
  baseQuantity: number;
  price: number;
  orderIndex: number;
};

function parseLocalOrIso(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive overlap on the timeline. */
export function batchIntervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

export function validateTicketTypeBatches(
  capacityTotal: number,
  batches: BatchDraftForValidation[],
): { ok: true } | { ok: false; message: string } {
  if (capacityTotal < 1) {
    return { ok: false, message: 'La capacidad total debe ser al menos 1.' };
  }
  if (batches.length === 0) {
    return { ok: false, message: 'Agregá al menos una tanda.' };
  }

  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);

  for (const b of sorted) {
    if (!b.name.trim()) return { ok: false, message: 'Cada tanda necesita un nombre.' };
    if (b.baseQuantity < 1) return { ok: false, message: 'La cantidad base de cada tanda debe ser al menos 1.' };
    if (b.price < 0) return { ok: false, message: 'El precio no puede ser negativo.' };
    const s = parseLocalOrIso(b.startAt);
    const e = parseLocalOrIso(b.endAt);
    if (!s || !e) return { ok: false, message: 'Revisá las fechas de inicio y cierre de cada tanda.' };
    if (e.getTime() < s.getTime()) {
      return { ok: false, message: `En "${b.name}": la fecha de cierre debe ser posterior al inicio.` };
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const bi = sorted[i]!;
    const si = parseLocalOrIso(bi.startAt)!;
    const ei = parseLocalOrIso(bi.endAt)!;
    for (let j = i + 1; j < sorted.length; j++) {
      const bj = sorted[j]!;
      const sj = parseLocalOrIso(bj.startAt)!;
      const ej = parseLocalOrIso(bj.endAt)!;
      if (batchIntervalsOverlap(si, ei, sj, ej)) {
        return {
          ok: false,
          message: `Las tandas "${bi.name}" y "${bj.name}" tienen ventanas de venta solapadas. Ajustá las fechas.`,
        };
      }
    }
  }

  const sum = sorted.reduce((acc, b) => acc + b.baseQuantity, 0);
  if (sum !== capacityTotal) {
    return {
      ok: false,
      message: `La suma de cantidades base (${sum}) debe igualar la capacidad total del tipo (${capacityTotal}).`,
    };
  }

  return { ok: true };
}

export function ticketTypeEditFormToValidationDrafts(form: TicketTypeEditForm): BatchDraftForValidation[] {
  return renumberBatches(form.batches).map((b) => ({
    name: b.name,
    startAt: b.startAt,
    endAt: b.endAt,
    baseQuantity: b.baseQuantity,
    price: b.price,
    orderIndex: b.orderIndex,
  }));
}
