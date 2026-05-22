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

export type TicketTypeBatchValidationError = {
  message: string;
  fieldErrors: Record<string, string>;
  batchErrors: Record<string, string>;
};

export function validateTicketTypeBatches(
  capacityTotal: number,
  batches: BatchDraftForValidation[],
  batchKeys?: string[],
): { ok: true } | { ok: false; error: TicketTypeBatchValidationError } {
  const fieldErrors: Record<string, string> = {};
  const batchErrors: Record<string, string> = {};
  const fail = (message: string, key?: string, batchIndex?: number) => {
    if (batchIndex != null && batchKeys?.[batchIndex]) {
      batchErrors[batchKeys[batchIndex]!] = message;
    } else if (key) {
      fieldErrors[key] = message;
    }
    return { ok: false as const, error: { message, fieldErrors, batchErrors } };
  };

  if (!Number.isFinite(capacityTotal) || capacityTotal < 1) {
    return fail('La capacidad total debe ser al menos 1.', 'capacityTotal');
  }
  if (batches.length === 0) {
    return fail('Agregá al menos una tanda con cupos y fechas de venta.', 'batches');
  }

  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    const idx = batches.findIndex((x) => x.orderIndex === b.orderIndex);
    if (!b.name.trim()) return fail('Cada tanda necesita un nombre.', undefined, idx);
    if (b.baseQuantity < 1) {
      return fail('La cantidad de cupos debe ser al menos 1.', undefined, idx);
    }
    if (!Number.isFinite(b.price) || b.price < 0) {
      return fail('El precio no puede ser negativo.', undefined, idx);
    }
    const s = parseLocalOrIso(b.startAt);
    const e = parseLocalOrIso(b.endAt);
    if (!s || !e) {
      return fail('Revisá las fechas de inicio y cierre de la tanda.', undefined, idx);
    }
    if (e.getTime() < s.getTime()) {
      return fail(`La fecha de cierre debe ser posterior al inicio.`, undefined, idx);
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
        const idxI = batches.findIndex((x) => x.orderIndex === bi.orderIndex);
        const idxJ = batches.findIndex((x) => x.orderIndex === bj.orderIndex);
        const msg = `Las ventanas de "${bi.name}" y "${bj.name}" se solapan. Ajustá las fechas.`;
        if (batchKeys?.[idxI]) batchErrors[batchKeys[idxI]!] = msg;
        if (batchKeys?.[idxJ]) batchErrors[batchKeys[idxJ]!] = msg;
        return {
          ok: false,
          error: { message: msg, fieldErrors, batchErrors },
        };
      }
    }
  }

  const sum = sorted.reduce((acc, b) => acc + b.baseQuantity, 0);
  if (sum !== capacityTotal) {
    return fail(
      `La suma de cupos en tandas (${sum}) debe igualar la capacidad total del tipo (${capacityTotal}).`,
      'capacityTotal',
    );
  }

  return { ok: true };
}

export function validateTicketTypeEditForm(
  form: TicketTypeEditForm,
): { ok: true } | { ok: false; error: TicketTypeBatchValidationError } {
  const fieldErrors: Record<string, string> = {};
  if (!form.name.trim()) {
    fieldErrors.name = 'El nombre del tipo es obligatorio (ej. VIP, General).';
    return {
      ok: false,
      error: {
        message: fieldErrors.name,
        fieldErrors,
        batchErrors: {},
      },
    };
  }
  const drafts = ticketTypeEditFormToValidationDrafts(form);
  const keys = renumberBatches(form.batches).map((b) => b.clientKey);
  return validateTicketTypeBatches(form.capacityTotal, drafts, keys);
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
