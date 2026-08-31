import { z } from 'zod';
import {
  VISUAL_TEMPLATE_DEFAULT_QR_ZONE,
  VISUAL_TEMPLATE_MAX_ELEMENTS,
  createVisualTemplateElementSchema,
  visualTemplateBackgroundTypeSchema,
  visualTemplateCanvasHeightSchema,
  visualTemplateCanvasWidthSchema,
  visualTemplateQrZoneSchema,
} from '../visual-template/visual-template.schema';

/** Default QR area (normalized). Kept in sync with API `ProducerTicketTemplateService`. */
export const TICKET_TEMPLATE_DEFAULT_QR_ZONE = VISUAL_TEMPLATE_DEFAULT_QR_ZONE;

export const ticketTemplateQrZoneSchema = visualTemplateQrZoneSchema;
export type TicketTemplateQrZone = z.infer<typeof ticketTemplateQrZoneSchema>;

export const TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS = [
  'eventName',
  'eventDate',
  'venueName',
  'city',
  'holderName',
  'orderCode',
  'ticketTypeName',
  'batchName',
  'ticketId',
  'disclaimer',
] as const;

export const ticketTemplateDynamicFieldKeySchema = z.enum(TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS);
export type TicketTemplateDynamicFieldKey = (typeof TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS)[number];

export const ticketTemplateElementTypeSchema = z.enum([
  'TEXT',
  'IMAGE',
  'LOGO',
  'DYNAMIC',
  'DIVIDER',
  'SHAPE',
]);
export type TicketTemplateElementType = z.infer<typeof ticketTemplateElementTypeSchema>;

export const ticketTemplateElementSchema = createVisualTemplateElementSchema({
  fieldKeySchema: ticketTemplateDynamicFieldKeySchema,
  imageUrlMode: 'ticketLegacy',
});
export type TicketTemplateElement = z.infer<typeof ticketTemplateElementSchema>;

export const upsertTicketTemplateDtoSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  /** Portrait ~320×560 or landscape ~560×320; both axes capped for API safety. */
  canvasWidth: visualTemplateCanvasWidthSchema.optional(),
  canvasHeight: visualTemplateCanvasHeightSchema.optional(),
  backgroundType: visualTemplateBackgroundTypeSchema.optional(),
  /** Hex, https URL, or data:image/* for local preview persistence. */
  backgroundValue: z.string().min(1).max(500_000).optional(),
  elementsJson: z.array(ticketTemplateElementSchema).max(VISUAL_TEMPLATE_MAX_ELEMENTS).optional(),
  qrZoneJson: ticketTemplateQrZoneSchema.optional(),
});
export type UpsertTicketTemplateDto = z.infer<typeof upsertTicketTemplateDtoSchema>;

export const ticketTemplateResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  ticketTypeId: z.string(),
  name: z.string(),
  canvasWidth: z.number(),
  canvasHeight: z.number(),
  backgroundType: z.string(),
  backgroundValue: z.string(),
  elementsJson: z.array(z.unknown()),
  qrZoneJson: z.unknown(),
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TicketTemplateResponse = z.infer<typeof ticketTemplateResponseSchema>;
