import { z } from 'zod';
import { isGastroDiscountDateRangeOrderValid } from '../gastro-discount-expiry';
import { gastroDiscountQrPayloadV1Schema } from '../gastro-discount-qr';

export const gastroDiscountDateInputSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
]);

export const gastroDiscountValidityModeSchema = z.enum(['DATE_RANGE', 'WEEKLY_RECURRING']);
export type GastroDiscountValidityMode = z.infer<typeof gastroDiscountValidityModeSchema>;

export const gastroWeekdaySchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);
export type GastroWeekday = z.infer<typeof gastroWeekdaySchema>;

export const GASTRO_WEEKDAY_LABELS_ES: Record<GastroWeekday, string> = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miércoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sábado',
  SUNDAY: 'domingo',
};

export const gastroDiscountStatusSchema = z.enum([
  'PENDING_REVIEW',
  'COMMISSION_NEGOTIATION',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
]);
export type GastroDiscountStatus = z.infer<typeof gastroDiscountStatusSchema>;

export const gastroDiscountOriginSchema = z.enum(['GASTRO', 'ADMIN']);
export type GastroDiscountOrigin = z.infer<typeof gastroDiscountOriginSchema>;

export const gastroDiscountResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  gastroProfileId: z.string().nullable(),
  gastroProfileName: z.string().nullable().optional(),
  code: z.string(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  detail: z.string().nullable(),
  discountDate: z.string().datetime().nullable(),
  validityMode: gastroDiscountValidityModeSchema.optional(),
  validWeekday: gastroWeekdaySchema.nullable().optional(),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  status: gastroDiscountStatusSchema,
  adminNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  qrToken: z.string().nullable().optional(),
  qrPayload: gastroDiscountQrPayloadV1Schema.nullable().optional(),
  emailSentAt: z.string().datetime().nullable().optional(),
  emailSendError: z.string().nullable().optional(),
  lastEmailAttemptAt: z.string().datetime().nullable().optional(),
  ownerEmail: z.string().nullable().optional(),
  ownerPhone: z.string().nullable().optional(),
  headerImageUrl: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  submittedImageUrls: z.array(z.string()).optional(),
  displayImageUrls: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdByOrigin: gastroDiscountOriginSchema.optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  hasPendingUpdate: z.boolean().optional(),
  pendingUpdate: z
    .object({
      title: z.string(),
      summary: z.string(),
      detail: z.string(),
      imageUrls: z.array(z.string()),
      validityMode: gastroDiscountValidityModeSchema,
      validWeekday: gastroWeekdaySchema.nullable(),
      validFrom: z.string().datetime().nullable(),
      validTo: z.string().datetime().nullable(),
      discountDate: z.string().datetime().nullable(),
    })
    .nullable()
    .optional(),
  pendingUpdateSubmittedAt: z.string().datetime().nullable().optional(),
});
export type GastroDiscountResponse = z.infer<typeof gastroDiscountResponseSchema>;

export const gastroDiscountCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(500),
    detail: z.string().min(1).max(5000),
    imageUrls: z.array(z.string().min(1).max(2_000_000)).min(1).max(30),
    validityMode: gastroDiscountValidityModeSchema.default('DATE_RANGE'),
    validFrom: gastroDiscountDateInputSchema.optional(),
    validTo: gastroDiscountDateInputSchema.optional(),
    /** @deprecated Legacy single-day input; use validFrom + validTo */
    discountDate: gastroDiscountDateInputSchema.optional(),
    validWeekday: gastroWeekdaySchema.optional(),
    commissionCoordinationAccepted: z.literal(true, {
      errorMap: () => ({
        message:
          'Debés confirmar que administración se comunicará con vos para coordinar la comisión.',
      }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.validityMode === 'DATE_RANGE') {
      const from = data.validFrom ?? data.discountDate;
      const to = data.validTo ?? data.discountDate;
      if (!from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['validFrom'],
          message: 'La fecha de inicio es obligatoria',
        });
      }
      if (!to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['validTo'],
          message: 'La fecha de cierre es obligatoria',
        });
      }
      if (from && to && !isGastroDiscountDateRangeOrderValid(from, to)) {
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
  });
export type GastroDiscountCreateInput = z.infer<typeof gastroDiscountCreateSchema>;

export const gastroDiscountUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    summary: z.string().min(1).max(500).optional(),
    detail: z.string().min(1).max(5000).optional(),
    imageUrls: z.array(z.string().min(1).max(2_000_000)).max(30).optional(),
    validityMode: gastroDiscountValidityModeSchema.optional(),
    validFrom: gastroDiscountDateInputSchema.optional(),
    validTo: gastroDiscountDateInputSchema.optional(),
    /** @deprecated Legacy single-day input; use validFrom + validTo */
    discountDate: gastroDiscountDateInputSchema.optional(),
    validWeekday: gastroWeekdaySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.validityMode === 'WEEKLY_RECURRING' && data.validWeekday === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validWeekday'],
        message: 'Elegí el día de la semana',
      });
    }
    if (data.validityMode !== 'DATE_RANGE') return;

    const touched =
      data.validFrom !== undefined ||
      data.validTo !== undefined ||
      data.discountDate !== undefined;
    if (!touched) return;

    const from = data.validFrom ?? data.discountDate;
    const to = data.validTo ?? data.discountDate;
    if (!from || !to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validTo'],
        message:
          'Para descuentos por fecha/rango, indicá una fecha de inicio y una fecha de cierre válida.',
      });
      return;
    }
    if (!isGastroDiscountDateRangeOrderValid(from, to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validTo'],
        message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio.',
      });
    }
  });
export type GastroDiscountUpdateInput = z.infer<typeof gastroDiscountUpdateSchema>;

export const adminGastroDiscountListQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  status: gastroDiscountStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AdminGastroDiscountListQuery = z.infer<typeof adminGastroDiscountListQuerySchema>;

export const adminGastroDiscountActionNoteSchema = z.object({
  note: z.string().max(2000).nullable().optional(),
});

export const adminGastroDiscountRejectSchema = z.object({
  reason: z.string().min(1).max(2000),
  note: z.string().max(2000).nullable().optional(),
});

export const adminGastroDiscountCancelSchema = adminGastroDiscountRejectSchema;

export type AdminGastroDiscountActionNote = z.infer<typeof adminGastroDiscountActionNoteSchema>;
export type AdminGastroDiscountReject = z.infer<typeof adminGastroDiscountRejectSchema>;
export type AdminGastroDiscountCancel = z.infer<typeof adminGastroDiscountCancelSchema>;

export const publicGastroLocationDiscountSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  detail: z.string().nullable(),
  headerImageUrl: z.string().nullable().optional(),
  discountDate: z.string().datetime().nullable(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  validityMode: gastroDiscountValidityModeSchema.optional(),
  validWeekday: gastroWeekdaySchema.nullable().optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number(),
});

export const publicGastroLocationDiscountsResponseSchema = z.object({
  discounts: z.array(publicGastroLocationDiscountSchema),
});

/** Subcategoría virtual en landing de gastronomía */
export const GASTRO_DISCOUNTS_SUBCATEGORY_SLUG = 'descuentos';

export const publicGastroDiscountListItemSchema = publicGastroLocationDiscountSchema.extend({
  locationId: z.string(),
  locationName: z.string(),
  locationCity: z.string().nullable(),
  locationSlug: z.string().nullable(),
});

export const publicGastroDiscountListQuerySchema = z.object({
  tenantId: z.string().min(1),
  subcategorySlug: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const publicGastroDiscountDetailSchema = publicGastroDiscountListItemSchema.extend({
  imageUrls: z.array(z.string()),
  eventId: z.string(),
  claimable: z.boolean(),
});

export const publicGastroDiscountClaimBodySchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email().max(320),
});

export const publicGastroDiscountClaimResponseSchema = z.object({
  claimId: z.string(),
  accessToken: z.string(),
  email: z.string().email(),
  emailSent: z.boolean(),
  qrPayload: gastroDiscountQrPayloadV1Schema,
  discountTitle: z.string().nullable(),
  locationName: z.string(),
});

export const publicGastroDiscountClaimViewSchema = z.object({
  claimId: z.string(),
  email: z.string().email(),
  qrPayload: gastroDiscountQrPayloadV1Schema,
  discountTitle: z.string().nullable(),
  discountSummary: z.string().nullable(),
  locationName: z.string(),
  locationId: z.string(),
  discountDate: z.string().datetime().nullable(),
  emailSentAt: z.string().datetime().nullable(),
});

export const publicGastroDiscountClaimViewQuerySchema = z.object({
  tenantId: z.string().min(1),
  accessToken: z.string().min(16),
});

export type PublicGastroDiscountListQuery = z.infer<typeof publicGastroDiscountListQuerySchema>;
export type PublicGastroDiscountClaimBody = z.infer<typeof publicGastroDiscountClaimBodySchema>;
export type PublicGastroDiscountClaimViewQuery = z.infer<
  typeof publicGastroDiscountClaimViewQuerySchema
>;
