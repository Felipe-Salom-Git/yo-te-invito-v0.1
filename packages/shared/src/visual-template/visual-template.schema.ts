import { z } from 'zod';

/** Default QR area (normalized). Shared by Ticket Canvas and Gastro QR Studio. */
export const VISUAL_TEMPLATE_DEFAULT_QR_ZONE = { x: 0.22, y: 0.58, w: 0.52, h: 0.28 } as const;

export const VISUAL_TEMPLATE_QR_SAFE_MARGIN = 0.04;
export const VISUAL_TEMPLATE_QR_MIN_W = 0.18;
export const VISUAL_TEMPLATE_QR_MIN_H = 0.18;

export const VISUAL_TEMPLATE_MAX_ELEMENTS = 40;
export const VISUAL_TEMPLATE_MAX_TEXT_LENGTH = 2000;
export const VISUAL_TEMPLATE_MAX_HTTPS_URL = 2048;

/** Normalized rect on canvas (0–1), top-left origin. Schema min 0.14; services may require 0.18. */
export const visualTemplateQrZoneSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.14).max(1),
  h: z.number().min(0.14).max(1),
});
export type VisualTemplateQrZone = z.infer<typeof visualTemplateQrZoneSchema>;

export const visualTemplateElementTypeSchema = z.enum([
  'TEXT',
  'IMAGE',
  'LOGO',
  'DYNAMIC',
  'DIVIDER',
  'SHAPE',
]);
export type VisualTemplateElementType = z.infer<typeof visualTemplateElementTypeSchema>;

export const visualTemplateElementStyleSchema = z
  .object({
    fontSize: z.number().min(6).max(96).optional(),
    color: z.string().max(32).optional(),
    fontWeight: z.string().max(16).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    borderRadius: z.number().min(0).max(1).optional(),
    backgroundColor: z.string().max(48).optional(),
    opacity: z.number().min(0).max(1).optional(),
    textShadow: z.enum(['none', 'subtle', 'medium', 'strong']).optional(),
  })
  .strict()
  .optional();
export type VisualTemplateElementStyle = z.infer<typeof visualTemplateElementStyleSchema>;

export type VisualTemplateImageUrlMode = 'ticketLegacy' | 'httpsOnly';

function imageUrlSchema(mode: VisualTemplateImageUrlMode) {
  if (mode === 'ticketLegacy') {
    return z
      .string()
      .max(500_000)
      .refine(
        (s) => s.startsWith('data:image/') || /^https?:\/\//i.test(s),
        'URL o imagen en base64 (data:image/...)',
      );
  }
  return z
    .string()
    .max(VISUAL_TEMPLATE_MAX_HTTPS_URL)
    .refine((s) => /^https:\/\//i.test(s), 'Solo URL HTTPS (sin data URL)');
}

export function createVisualTemplateElementSchema<T extends z.ZodType<string>>(opts: {
  fieldKeySchema: T;
  imageUrlMode: VisualTemplateImageUrlMode;
}) {
  return z
    .object({
      id: z.string().min(1).max(128),
      type: visualTemplateElementTypeSchema,
      x: z.number().min(-0.05).max(1.05),
      y: z.number().min(-0.05).max(1.05),
      w: z.number().min(0.02).max(1.2),
      h: z.number().min(0.01).max(1.2),
      zIndex: z.number().int().min(0).max(999),
      rotation: z.number().min(-180).max(180).optional(),
      style: visualTemplateElementStyleSchema,
      content: z.string().max(VISUAL_TEMPLATE_MAX_TEXT_LENGTH).optional(),
      fieldKey: opts.fieldKeySchema.optional(),
      imageUrl: imageUrlSchema(opts.imageUrlMode).optional(),
    })
    .strict()
    .superRefine((el, ctx) => {
      if (el.type === 'DYNAMIC' && !el.fieldKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'DYNAMIC requires fieldKey',
          path: ['fieldKey'],
        });
      }
      if ((el.type === 'IMAGE' || el.type === 'LOGO') && !el.imageUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'IMAGE/LOGO requires imageUrl',
          path: ['imageUrl'],
        });
      }
    });
}

export const visualTemplateCanvasWidthSchema = z.number().int().min(240).max(900);
export const visualTemplateCanvasHeightSchema = z.number().int().min(240).max(900);
export const visualTemplateBackgroundTypeSchema = z.enum(['SOLID', 'IMAGE']);
