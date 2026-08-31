import { z } from 'zod';

export const activityCouponScanStatusSchema = z.enum([
  'VALID',
  'INVALID',
  'EXPIRED',
  'INACTIVE',
  'NOT_VALID_TODAY',
  'ALREADY_USED',
]);
export type ActivityCouponScanStatus = z.infer<typeof activityCouponScanStatusSchema>;

export const validateActivityCouponBodySchema = z.object({
  qrPayload: z.string().min(1, 'qrPayload is required'),
  deviceId: z.string().optional(),
});
export type ValidateActivityCouponBody = z.infer<typeof validateActivityCouponBodySchema>;

export const validateActivityCouponResponseSchema = z.object({
  status: activityCouponScanStatusSchema,
  title: z.string(),
  message: z.string(),
  coupon: z
    .object({
      id: z.string(),
      title: z.string(),
      valueLabel: z.string(),
      activityName: z.string().optional(),
    })
    .optional(),
});
export type ValidateActivityCouponResponse = z.infer<typeof validateActivityCouponResponseSchema>;
