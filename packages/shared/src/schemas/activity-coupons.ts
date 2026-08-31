import { z } from 'zod';
import { isGastroDiscountDateRangeOrderValid } from '../gastro-discount-expiry';
import { gastroDiscountDateInputSchema, gastroWeekdaySchema } from './gastro-discounts';

/** Technical Event.category for Actividades. Public copy stays «Actividades». */
export const ACTIVITY_COUPON_EVENT_CATEGORY = 'excursion';

export const activityCouponTypeSchema = z.enum(['PERCENT', 'FIXED']);
export type ActivityCouponType = z.infer<typeof activityCouponTypeSchema>;

export const activityCouponStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
]);
export type ActivityCouponStatus = z.infer<typeof activityCouponStatusSchema>;

export const activityCouponOriginSchema = z.enum(['ADMIN', 'OPERATOR']);
export type ActivityCouponOrigin = z.infer<typeof activityCouponOriginSchema>;

export const activityCouponValidityModeSchema = z.enum(['DATE_RANGE', 'WEEKLY_RECURRING']);
export type ActivityCouponValidityMode = z.infer<typeof activityCouponValidityModeSchema>;

export const activityCouponClaimStatusSchema = z.enum([
  'ACTIVE',
  'USED',
  'EXPIRED',
  'CANCELLED',
]);
export type ActivityCouponClaimStatus = z.infer<typeof activityCouponClaimStatusSchema>;

export const ACTIVITY_COUPON_PUBLISHED_STATUSES: ActivityCouponStatus[] = [
  'ACTIVE',
  'APPROVED',
];

export function isEventCategoryEligibleForActivityCoupon(category: string | null | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === ACTIVITY_COUPON_EVENT_CATEGORY;
}

export function activityCouponBelongsToOperator(
  eventOperatorId: string | null | undefined,
  operatorId: string,
): boolean {
  return Boolean(eventOperatorId && eventOperatorId === operatorId);
}

/** ScannerAccount.parentProfileType required to validate Activity coupons. */
export const ACTIVITY_COUPON_SCANNER_PARENT_TYPE = 'EXCURSION_OPERATOR';

/**
 * Server-side Scanner allow rule (V1 operator-wide).
 * Does not trust UI `discounts[]` / selected target.
 * V1 does not scope by Event or EventOccurrence.
 */
export function canScannerAccessActivityCoupon(input: {
  scannerParentType: string;
  scannerParentProfileId: string;
  scannerTenantId: string;
  couponTenantId: string;
  couponExcursionOperatorId: string | null | undefined;
  eventCategory: string | null | undefined;
}): boolean {
  if (input.scannerParentType !== ACTIVITY_COUPON_SCANNER_PARENT_TYPE) return false;
  if (!input.scannerTenantId || input.couponTenantId !== input.scannerTenantId) return false;
  if (
    !activityCouponBelongsToOperator(
      input.couponExcursionOperatorId,
      input.scannerParentProfileId,
    )
  ) {
    return false;
  }
  return isEventCategoryEligibleForActivityCoupon(input.eventCategory);
}

export function initialStatusForActivityCouponOrigin(
  origin: ActivityCouponOrigin,
): 'ACTIVE' | 'PENDING_REVIEW' {
  return origin === 'ADMIN' ? 'ACTIVE' : 'PENDING_REVIEW';
}

const httpsImageUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((u) => /^https:\/\//i.test(u), 'La imagen debe ser una URL HTTPS');

function refineOffer(
  data: { type: 'PERCENT' | 'FIXED'; value: number },
  ctx: z.RefinementCtx,
) {
  if (data.type === 'PERCENT' && (data.value < 1 || data.value > 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'El porcentaje debe estar entre 1 y 100',
    });
  }
  if (data.type === 'FIXED' && data.value < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'El valor fijo debe ser mayor a 0',
    });
  }
}

function refineValidity(
  data: {
    validityMode: 'DATE_RANGE' | 'WEEKLY_RECURRING';
    validFrom?: string;
    validTo?: string;
    validWeekday?: z.infer<typeof gastroWeekdaySchema>;
  },
  ctx: z.RefinementCtx,
) {
  if (data.validityMode === 'DATE_RANGE') {
    if (!data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validFrom'],
        message: 'La fecha de inicio es obligatoria',
      });
    }
    if (!data.validTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validTo'],
        message: 'La fecha de cierre es obligatoria',
      });
    }
    if (
      data.validFrom &&
      data.validTo &&
      !isGastroDiscountDateRangeOrderValid(data.validFrom, data.validTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validTo'],
        message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio.',
      });
    }
    return;
  }
  if (!data.validWeekday) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validWeekday'],
      message: 'Elegí el día de la semana',
    });
  }
}

export const activityCouponCreateSchema = z
  .object({
    eventId: z.string().min(1),
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(500),
    detail: z.string().min(1).max(5000),
    type: activityCouponTypeSchema,
    value: z.number().finite().min(0).max(1_000_000),
    imageUrls: z.array(httpsImageUrl).max(10).optional(),
    validityMode: activityCouponValidityModeSchema.default('DATE_RANGE'),
    validFrom: gastroDiscountDateInputSchema.optional(),
    validTo: gastroDiscountDateInputSchema.optional(),
    validWeekday: gastroWeekdaySchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    refineOffer(data, ctx);
    refineValidity(data, ctx);
  });
export type ActivityCouponCreateInput = z.infer<typeof activityCouponCreateSchema>;

export const activityCouponUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    summary: z.string().min(1).max(500).optional(),
    detail: z.string().min(1).max(5000).optional(),
    type: activityCouponTypeSchema.optional(),
    value: z.number().finite().min(0).max(1_000_000).optional(),
    imageUrls: z.array(httpsImageUrl).max(10).optional(),
    validityMode: activityCouponValidityModeSchema.optional(),
    validFrom: gastroDiscountDateInputSchema.optional(),
    validTo: gastroDiscountDateInputSchema.optional(),
    validWeekday: gastroWeekdaySchema.nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type != null && data.value != null) {
      refineOffer({ type: data.type, value: data.value }, ctx);
    } else if (data.type === 'PERCENT' && data.value != null && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'El porcentaje debe estar entre 1 y 100',
      });
    }
    if (data.validityMode) {
      refineValidity(
        {
          validityMode: data.validityMode,
          validFrom: data.validFrom,
          validTo: data.validTo,
          validWeekday: data.validWeekday ?? undefined,
        },
        ctx,
      );
    }
  });
export type ActivityCouponUpdateInput = z.infer<typeof activityCouponUpdateSchema>;

export const activityCouponStatusPatchSchema = z
  .object({
    status: z.enum(['ACTIVE', 'CANCELLED']),
  })
  .strict();
export type ActivityCouponStatusPatch = z.infer<typeof activityCouponStatusPatchSchema>;

export const activityCouponRejectSchema = z
  .object({
    reason: z.string().min(1).max(2000),
  })
  .strict();
export type ActivityCouponRejectInput = z.infer<typeof activityCouponRejectSchema>;

export const activityCouponOperatorIdParamsSchema = z
  .object({
    operatorId: z.string().min(1),
  })
  .strict();

export const activityCouponIdParamsSchema = z
  .object({
    operatorId: z.string().min(1),
    couponId: z.string().min(1),
  })
  .strict();

export const activityCouponPublicIdParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export const activityCouponClaimBodySchema = z
  .object({
    email: z.string().email().max(320).optional(),
  })
  .strict();
export type ActivityCouponClaimBody = z.infer<typeof activityCouponClaimBodySchema>;

export const activityCouponResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  eventTitle: z.string().nullable().optional(),
  excursionOperatorId: z.string(),
  operatorName: z.string().nullable().optional(),
  code: z.string(),
  title: z.string(),
  summary: z.string(),
  detail: z.string(),
  type: activityCouponTypeSchema,
  value: z.number(),
  benefitLabel: z.string(),
  validityMode: activityCouponValidityModeSchema,
  validWeekday: gastroWeekdaySchema.nullable().optional(),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  couponDate: z.string().datetime().nullable().optional(),
  imageUrls: z.array(z.string()),
  status: activityCouponStatusSchema,
  rejectionReason: z.string().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdByOrigin: activityCouponOriginSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ActivityCouponResponse = z.infer<typeof activityCouponResponseSchema>;

export const activityCouponListResponseSchema = z.object({
  data: z.array(activityCouponResponseSchema),
});
export type ActivityCouponListResponse = z.infer<typeof activityCouponListResponseSchema>;

export const activityCouponPublicClaimBodySchema = z
  .object({
    tenantId: z.string().min(1),
    email: z.string().email().max(320),
  })
  .strict();
export type ActivityCouponPublicClaimBody = z.infer<typeof activityCouponPublicClaimBodySchema>;

export const activityCouponClaimViewQuerySchema = z
  .object({
    tenantId: z.string().min(1),
    accessToken: z.string().min(1).optional(),
  })
  .strict();

export const activityCouponClaimViewSchema = z.object({
  claimId: z.string(),
  accessToken: z.string(),
  email: z.string().email(),
  emailSent: z.boolean().optional(),
  qrPayload: z.string(),
  shortCode: z.string(),
  shortCodeDisplay: z.string(),
  status: activityCouponClaimStatusSchema,
  coupon: activityCouponResponseSchema,
  eventTitle: z.string().nullable(),
  operatorName: z.string().nullable(),
  validTo: z.string().datetime().nullable(),
});
export type ActivityCouponClaimView = z.infer<typeof activityCouponClaimViewSchema>;

export const meActivityCouponItemSchema = activityCouponClaimViewSchema;
export type MeActivityCouponItem = ActivityCouponClaimView;

export const meActivityCouponListResponseSchema = z.object({
  data: z.array(meActivityCouponItemSchema),
});
export type MeActivityCouponListResponse = z.infer<typeof meActivityCouponListResponseSchema>;

export function isActivityCouponClaimActive(status: string): boolean {
  return status === 'ACTIVE';
}

export const activityCouponMetricsSchema = z.object({
  claimsIssued: z.number().int().nonnegative(),
  claimsUsed: z.number().int().nonnegative(),
  claimsUnused: z.number().int().nonnegative(),
  validations: z.number().int().nonnegative(),
  useRate: z.number().nonnegative(),
});
export type ActivityCouponMetrics = z.infer<typeof activityCouponMetricsSchema>;

/** KPI V1: issued / used / unused (ACTIVE) / validations / use rate %. No settlement. */
export function computeActivityCouponMetrics(input: {
  claimsIssued: number;
  claimsUsed: number;
  claimsUnused: number;
  validations: number;
}): ActivityCouponMetrics {
  const issued = Math.max(0, input.claimsIssued);
  const used = Math.max(0, input.claimsUsed);
  const unused = Math.max(0, input.claimsUnused);
  const validations = Math.max(0, input.validations);
  const useRate = issued === 0 ? 0 : Math.round((used / issued) * 1000) / 10;
  return {
    claimsIssued: issued,
    claimsUsed: used,
    claimsUnused: unused,
    validations,
    useRate,
  };
}

/** Transversal: email == null / blank → skip EMAIL. Never invent addresses. */
export function shouldSendActivityCouponClaimEmail(
  email: string | null | undefined,
): boolean {
  return Boolean(email?.trim());
}
