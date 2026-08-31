import { z } from 'zod';
import {
  gastroDiscountStatusSchema,
  gastroDiscountValidityModeSchema,
  gastroWeekdaySchema,
} from './gastro-discounts';
import {
  gastroDiscountClaimStatusSchema,
  gastroDiscountClaimSourceSchema,
  gastroDiscountClaimTypeSchema,
} from './gastro-courtesy-discounts';

export const gastroDiscountSummaryDiscountSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  detail: z.string().nullable(),
  status: gastroDiscountStatusSchema,
  validityMode: gastroDiscountValidityModeSchema.optional(),
  validWeekday: gastroWeekdaySchema.nullable().optional(),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  discountDate: z.string().datetime().nullable(),
  locationId: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const gastroDiscountSummaryMetricsSchema = z.object({
  totalClaims: z.number().int().min(0),
  availableClaims: z.number().int().min(0),
  usedClaims: z.number().int().min(0),
  expiredClaims: z.number().int().min(0),
  cancelledClaims: z.number().int().min(0),
  courtesyClaims: z.number().int().min(0),
  publicClaims: z.number().int().min(0),
  emailSentCount: z.number().int().min(0),
  emailFailedCount: z.number().int().min(0),
  validationCount: z.number().int().min(0).optional(),
});

export const gastroDiscountSummaryClaimSchema = z.object({
  id: z.string(),
  status: gastroDiscountClaimStatusSchema,
  type: gastroDiscountClaimTypeSchema,
  source: gastroDiscountClaimSourceSchema,
  email: z.string().email(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  createdAt: z.string().datetime(),
  usedAt: z.string().datetime().nullable(),
  emailSentAt: z.string().datetime().nullable(),
  emailSendError: z.string().nullable(),
});

export const gastroDiscountSummaryResponseSchema = z.object({
  discount: gastroDiscountSummaryDiscountSchema,
  metrics: gastroDiscountSummaryMetricsSchema,
  claims: z.array(gastroDiscountSummaryClaimSchema),
  hasExistingClaims: z.boolean(),
});

export const gastroDiscountStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELLED']),
});

export type GastroDiscountSummaryDiscount = z.infer<typeof gastroDiscountSummaryDiscountSchema>;
export type GastroDiscountSummaryMetrics = z.infer<typeof gastroDiscountSummaryMetricsSchema>;
export type GastroDiscountSummaryClaim = z.infer<typeof gastroDiscountSummaryClaimSchema>;
export type GastroDiscountSummaryResponse = z.infer<typeof gastroDiscountSummaryResponseSchema>;
export type GastroDiscountStatusUpdate = z.infer<typeof gastroDiscountStatusUpdateSchema>;

export const gastroDiscountArchiveActionSchema = z.object({
  archived: z.boolean(),
});
export type GastroDiscountArchiveAction = z.infer<typeof gastroDiscountArchiveActionSchema>;
