import { z } from 'zod';

export const gastroDiscountScanStatusSchema = z.enum([
  'VALID',
  'INVALID',
  'EXPIRED',
  'INACTIVE',
  'NOT_VALID_TODAY',
  'ALREADY_USED',
  'LIMIT_REACHED',
]);
export type GastroDiscountScanStatus = z.infer<typeof gastroDiscountScanStatusSchema>;

export const validateGastroDiscountBodySchema = z.object({
  qrPayload: z.string().min(1, 'qrPayload is required'),
  deviceId: z.string().optional(),
  /** GASTRO_OWNER: authorized local. When omitted, the owner's default operational profile is used. */
  profileId: z.string().min(1).optional(),
});
export type ValidateGastroDiscountBody = z.infer<typeof validateGastroDiscountBodySchema>;

export const gastroDiscountScanDiscountSchema = z.object({
  id: z.string(),
  title: z.string(),
  valueLabel: z.string(),
  localName: z.string().optional(),
  /**
   * G8.5 — Distinguishes a courtesy (benefit text comes from the campaign, never "0%").
   * Optional for backward compatibility with older scanner clients.
   */
  kind: z.enum(['DISCOUNT', 'COURTESY']).optional(),
  /**
   * G8.6 — display short code (`ABC-123`) of the claim that was just scanned. Only ever the
   * scanned claim's own code (never another claim's); absent for master-QR validations.
   */
  shortCode: z.string().optional(),
});

export const validateGastroDiscountResponseSchema = z.object({
  status: gastroDiscountScanStatusSchema,
  title: z.string(),
  message: z.string(),
  discount: gastroDiscountScanDiscountSchema.optional(),
});
export type ValidateGastroDiscountResponse = z.infer<typeof validateGastroDiscountResponseSchema>;
