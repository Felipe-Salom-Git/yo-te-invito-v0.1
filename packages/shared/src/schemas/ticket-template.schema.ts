import { z } from 'zod';

/** Default QR area (normalized). Kept in sync with API `ProducerTicketTemplateService`. */
export const TICKET_TEMPLATE_DEFAULT_QR_ZONE = { x: 0.22, y: 0.58, w: 0.52, h: 0.28 } as const;

/** Normalized rect on canvas (0–1), top-left origin. */
export const ticketTemplateQrZoneSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.14).max(1),
  h: z.number().min(0.14).max(1),
});
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

const elementStyleSchema = z
  .object({
    fontSize: z.number().min(6).max(96).optional(),
    color: z.string().max(32).optional(),
    fontWeight: z.string().max(16).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    borderRadius: z.number().min(0).max(1).optional(),
    backgroundColor: z.string().max(48).optional(),
    opacity: z.number().min(0).max(1).optional(),
    /** Sombra del texto (legibilidad sobre imagen de fondo). */
    textShadow: z.enum(['none', 'subtle', 'medium', 'strong']).optional(),
  })
  .strict()
  .optional();

export const ticketTemplateElementSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: ticketTemplateElementTypeSchema,
    x: z.number().min(-0.05).max(1.05),
    y: z.number().min(-0.05).max(1.05),
    w: z.number().min(0.02).max(1.2),
    h: z.number().min(0.01).max(1.2),
    zIndex: z.number().int().min(0).max(999),
    rotation: z.number().min(-180).max(180).optional(),
    style: elementStyleSchema,
    content: z.string().max(2000).optional(),
    fieldKey: ticketTemplateDynamicFieldKeySchema.optional(),
    imageUrl: z
      .string()
      .max(500_000)
      .refine(
        (s) => s.startsWith('data:image/') || /^https?:\/\//i.test(s),
        'URL o imagen en base64 (data:image/...)',
      )
      .optional(),
  })
  .strict()
  .superRefine((el, ctx) => {
    if (el.type === 'DYNAMIC' && !el.fieldKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DYNAMIC requires fieldKey', path: ['fieldKey'] });
    }
    if ((el.type === 'IMAGE' || el.type === 'LOGO') && !el.imageUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'IMAGE/LOGO requires imageUrl', path: ['imageUrl'] });
    }
  });
export type TicketTemplateElement = z.infer<typeof ticketTemplateElementSchema>;

export const upsertTicketTemplateDtoSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  /** Portrait ~320×560 or landscape ~560×320; both axes capped for API safety. */
  canvasWidth: z.number().int().min(240).max(900).optional(),
  canvasHeight: z.number().int().min(240).max(900).optional(),
  backgroundType: z.enum(['SOLID', 'IMAGE']).optional(),
  /** Hex, https URL, or data:image/* for local preview persistence. */
  backgroundValue: z.string().min(1).max(500_000).optional(),
  elementsJson: z.array(ticketTemplateElementSchema).max(40).optional(),
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
