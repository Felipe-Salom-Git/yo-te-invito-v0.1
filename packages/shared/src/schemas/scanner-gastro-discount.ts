import { z } from 'zod';

export const gastroDiscountScanStatusSchema = z.enum([
  'VALID',
  'INVALID',
  'EXPIRED',
  'INACTIVE',
  'ALREADY_USED',
  'LIMIT_REACHED',
]);
export type GastroDiscountScanStatus = z.infer<typeof gastroDiscountScanStatusSchema>;

export const validateGastroDiscountBodySchema = z.object({
  qrPayload: z.string().min(1, 'qrPayload is required'),
  deviceId: z.string().optional(),
});
export type ValidateGastroDiscountBody = z.infer<typeof validateGastroDiscountBodySchema>;

export const gastroDiscountScanDiscountSchema = z.object({
  id: z.string(),
  title: z.string(),
  valueLabel: z.string(),
  localName: z.string().optional(),
});

export const validateGastroDiscountResponseSchema = z.object({
  status: gastroDiscountScanStatusSchema,
  title: z.string(),
  message: z.string(),
  discount: gastroDiscountScanDiscountSchema.optional(),
});
export type ValidateGastroDiscountResponse = z.infer<typeof validateGastroDiscountResponseSchema>;
