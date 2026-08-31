/**
 * Ticket template schema regression after visual-template extraction.
 * Run: pnpm --filter api run test:ticket-template-schema
 */

import {
  TICKET_TEMPLATE_DEFAULT_QR_ZONE,
  TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS,
  ticketTemplateElementSchema,
  upsertTicketTemplateDtoSchema,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const textEl = ticketTemplateElementSchema.safeParse({
  id: 't1',
  type: 'TEXT',
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.08,
  zIndex: 1,
  content: 'Evento demo',
  style: { fontSize: 16, color: '#fff', textAlign: 'center' },
});
assert(textEl.success, 'legacy TEXT element still validates');

const dynEl = ticketTemplateElementSchema.safeParse({
  id: 'd1',
  type: 'DYNAMIC',
  x: 0.1,
  y: 0.2,
  w: 0.8,
  h: 0.06,
  zIndex: 2,
  fieldKey: 'eventName',
});
assert(dynEl.success, 'DYNAMIC eventName still validates');

const holder = ticketTemplateElementSchema.safeParse({
  id: 'd2',
  type: 'DYNAMIC',
  x: 0.1,
  y: 0.3,
  w: 0.8,
  h: 0.06,
  zIndex: 3,
  fieldKey: 'holderName',
});
assert(holder.success, 'DYNAMIC holderName still validates');

const dataImg = ticketTemplateElementSchema.safeParse({
  id: 'logo',
  type: 'LOGO',
  x: 0.35,
  y: 0.05,
  w: 0.3,
  h: 0.1,
  zIndex: 4,
  imageUrl: 'data:image/png;base64,aaaa',
});
assert(dataImg.success, 'ticket LOGO still allows data:image URL');

const gastroKey = ticketTemplateElementSchema.safeParse({
  id: 'bad',
  type: 'DYNAMIC',
  x: 0.1,
  y: 0.1,
  w: 0.5,
  h: 0.05,
  zIndex: 1,
  fieldKey: 'discountTitle',
});
assert(!gastroKey.success, 'ticket schema rejects gastro fieldKey');

const upsert = upsertTicketTemplateDtoSchema.safeParse({
  name: 'Diseño personalizado',
  canvasWidth: 320,
  canvasHeight: 560,
  backgroundType: 'SOLID',
  backgroundValue: '#0a0a0a',
  qrZoneJson: TICKET_TEMPLATE_DEFAULT_QR_ZONE,
  elementsJson: [textEl.data, dynEl.data],
});
assert(upsert.success, 'legacy upsert DTO still validates');

assert(TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS.includes('orderCode'), 'ticket dynamic keys intact');
assert(TICKET_TEMPLATE_DEFAULT_QR_ZONE.w === 0.52, 'default QR zone unchanged');

console.log('PASS: ticket template schema regression');
