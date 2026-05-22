import type { CreateCourtesyBody } from '@yo-te-invito/shared';
import type { TicketTypeResponse } from '@/repositories/interfaces';

export type CourtesyMode = CreateCourtesyBody['mode'];

export const COURTESY_MODE_LABELS: Record<CourtesyMode, string> = {
  CONSUMES_BATCH: 'Desde tipo de entrada',
  FREE_CAPACITY: 'Capacidad del evento',
};

export const COURTESY_MODE_DESCRIPTIONS: Record<CourtesyMode, string> = {
  CONSUMES_BATCH:
    'Descuenta cupos de la tanda activa del tipo elegido y del stock del tipo. Mismo impacto que una venta en esa tanda.',
  FREE_CAPACITY:
    'No consume tandas ni tipos de entrada. Solo valida el cupo total del evento (si el evento tiene capacidad máxima configurada).',
};

export type CourtesyFormState = {
  mode: CourtesyMode;
  ticketTypeId: string;
  quantity: number;
  note: string;
};

export type CourtesyFormValidation = {
  fieldErrors: Record<string, string>;
  message: string | null;
};

export function validateCourtesyForm(
  form: CourtesyFormState,
  ticketTypes: TicketTypeResponse[],
): CourtesyFormValidation {
  const fieldErrors: Record<string, string> = {};

  if (!Number.isFinite(form.quantity) || form.quantity < 1) {
    fieldErrors.quantity = 'La cantidad debe ser al menos 1.';
  } else if (form.quantity > 500) {
    fieldErrors.quantity = 'Máximo 500 entradas por otorgamiento.';
  }

  if (form.mode === 'CONSUMES_BATCH') {
    if (!form.ticketTypeId) {
      fieldErrors.ticketTypeId = 'Elegí un tipo de entrada.';
    } else {
      const tt = ticketTypes.find((t) => t.id === form.ticketTypeId);
      if (!tt) {
        fieldErrors.ticketTypeId = 'Tipo de entrada no válido.';
      } else if (form.quantity > 0 && form.quantity > (tt.capacityAvailable ?? 0)) {
        fieldErrors.quantity = `Supera el stock disponible del tipo (${tt.capacityAvailable ?? 0}).`;
      }
    }
    if (ticketTypes.length === 0) {
      fieldErrors.ticketTypeId =
        'No hay tipos de entrada activos. Configurá entradas en el evento primero.';
    }
  }

  const message =
    Object.keys(fieldErrors).length > 0
      ? Object.values(fieldErrors)[0] ?? 'Revisá el formulario.'
      : null;

  return { fieldErrors, message };
}

export function buildCourtesyCreateBody(form: CourtesyFormState): CreateCourtesyBody {
  return {
    mode: form.mode,
    ticketTypeId:
      form.mode === 'CONSUMES_BATCH' ? form.ticketTypeId || undefined : undefined,
    quantity: form.quantity,
    note: form.note.trim() || undefined,
  };
}

export function mapCourtesyApiMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('tickettypeid is required')) {
    return 'Elegí un tipo de entrada para este modo.';
  }
  if (m.includes('exceeds batch capacity') || m.includes('insufficient availability')) {
    return 'No hay stock suficiente en la tanda activa o en el tipo de entrada.';
  }
  if (m.includes('event capacity exceeded')) {
    return 'Supera la capacidad máxima configurada del evento.';
  }
  if (m.includes('no_active_batch')) {
    return 'No hay una tanda de venta activa para este tipo. Revisá fechas y stock.';
  }
  if (m.includes('ticket type not found')) {
    return 'El tipo de entrada no existe o no está activo.';
  }
  return raw;
}

export function courtesyConfirmMessage(
  form: CourtesyFormState,
  ticketTypeName?: string,
): string {
  const qty = form.quantity;
  if (form.mode === 'CONSUMES_BATCH') {
    return `¿Emitir ${qty} entrada(s) de cortesía del tipo "${ticketTypeName ?? 'seleccionado'}"? Se descontará stock de la tanda activa.`;
  }
  return `¿Emitir ${qty} entrada(s) de cortesía usando capacidad del evento (sin consumir tandas)?`;
}
