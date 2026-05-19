import type { TicketTemplateDynamicFieldKey } from '@yo-te-invito/shared';

export const MOCK_TICKET_PREVIEW: Record<TicketTemplateDynamicFieldKey, string> = {
  eventName: 'Fiesta Bresh — Invierno',
  eventDate: 'vie 28 mar 2026 · 23:00',
  venueName: 'Movistar Arena',
  city: 'Buenos Aires',
  holderName: 'María Gómez',
  orderCode: 'ORD-8F2K9Q',
  ticketTypeName: 'VIP',
  batchName: 'Tanda 2',
  ticketId: 'TCK_demo_01',
  disclaimer: 'No válido si está alterado. Presentar DNI.',
};

export function resolveDynamicField(key: TicketTemplateDynamicFieldKey): string {
  return MOCK_TICKET_PREVIEW[key] ?? '';
}
