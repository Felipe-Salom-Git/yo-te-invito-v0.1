import { z } from 'zod';
import {
  VISUAL_TEMPLATE_DEFAULT_QR_ZONE,
  VISUAL_TEMPLATE_MAX_ELEMENTS,
  VISUAL_TEMPLATE_MAX_HTTPS_URL,
  createVisualTemplateElementSchema,
  visualTemplateBackgroundTypeSchema,
  visualTemplateCanvasHeightSchema,
  visualTemplateCanvasWidthSchema,
  visualTemplateQrZoneSchema,
} from '../visual-template/visual-template.schema';

export const DISCOUNT_VISUAL_DYNAMIC_FIELD_KEYS = [
  'gastroName',
  'discountTitle',
  'discountValue',
  'discountValidity',
  'shortCode',
] as const;

export const discountVisualDynamicFieldKeySchema = z.enum(DISCOUNT_VISUAL_DYNAMIC_FIELD_KEYS);
export type DiscountVisualDynamicFieldKey = (typeof DISCOUNT_VISUAL_DYNAMIC_FIELD_KEYS)[number];

export const discountVisualTemplateElementSchema = createVisualTemplateElementSchema({
  fieldKeySchema: discountVisualDynamicFieldKeySchema,
  imageUrlMode: 'httpsOnly',
});
export type DiscountVisualTemplateElement = z.infer<typeof discountVisualTemplateElementSchema>;

const discountVisualBackgroundValueSchema = z
  .string()
  .min(1)
  .max(VISUAL_TEMPLATE_MAX_HTTPS_URL)
  .refine((s) => {
    if (s.startsWith('data:')) return false;
    if (/^https:\/\//i.test(s)) return true;
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return true;
    if (/^rgba?\(/i.test(s) && s.length <= 48) return true;
    return false;
  }, 'Fondo: hex, rgba o URL HTTPS (sin data URL)');

export const upsertGastroDiscountVisualTemplateDtoSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    canvasWidth: visualTemplateCanvasWidthSchema.optional(),
    canvasHeight: visualTemplateCanvasHeightSchema.optional(),
    backgroundType: visualTemplateBackgroundTypeSchema.optional(),
    backgroundValue: discountVisualBackgroundValueSchema.optional(),
    elementsJson: z.array(discountVisualTemplateElementSchema).max(VISUAL_TEMPLATE_MAX_ELEMENTS).optional(),
    qrZoneJson: visualTemplateQrZoneSchema.optional(),
  })
  .strict()
  .superRefine((dto, ctx) => {
    if (dto.backgroundType === 'IMAGE' && dto.backgroundValue && !/^https:\/\//i.test(dto.backgroundValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El fondo imagen debe ser URL HTTPS',
        path: ['backgroundValue'],
      });
    }
  });
export type UpsertGastroDiscountVisualTemplateDto = z.infer<
  typeof upsertGastroDiscountVisualTemplateDtoSchema
>;

export const gastroDiscountVisualTemplateResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  gastroDiscountId: z.string(),
  name: z.string(),
  canvasWidth: z.number(),
  canvasHeight: z.number(),
  backgroundType: z.string(),
  backgroundValue: z.string(),
  elementsJson: z.array(discountVisualTemplateElementSchema),
  qrZoneJson: visualTemplateQrZoneSchema,
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GastroDiscountVisualTemplateResponse = z.infer<
  typeof gastroDiscountVisualTemplateResponseSchema
>;

export const gastroDiscountVisualTemplateGetResponseSchema = z.object({
  template: gastroDiscountVisualTemplateResponseSchema.nullable(),
});

export { VISUAL_TEMPLATE_DEFAULT_QR_ZONE as DISCOUNT_VISUAL_DEFAULT_QR_ZONE };
