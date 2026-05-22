import { z } from 'zod';

export const referralCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED_PER_TICKET']);
export type ReferralCommissionType = z.infer<typeof referralCommissionTypeSchema>;

export const referralCommercialProposalStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
]);
export type ReferralCommercialProposalStatus = z.infer<typeof referralCommercialProposalStatusSchema>;

export const referralCommercialAgreementStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'ENDED',
  'CANCELLED',
]);
export type ReferralCommercialAgreementStatus = z.infer<typeof referralCommercialAgreementStatusSchema>;

const optionalDateTime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .nullable()
  .optional();

export const createReferralCommercialProposalSchema = z
  .object({
    referrerProfileId: z.string().cuid(),
    eventId: z.string().cuid(),
    commissionType: referralCommissionTypeSchema,
    commissionValue: z.coerce.number().positive('commissionValue debe ser mayor a 0'),
    message: z.string().trim().max(2000).optional(),
    terms: z.string().trim().max(4000).optional(),
    startAt: optionalDateTime,
    endAt: optionalDateTime,
  })
  .superRefine((data, ctx) => {
    if (data.commissionType === 'PERCENTAGE') {
      if (data.commissionValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El porcentaje no puede superar 100',
          path: ['commissionValue'],
        });
      }
    } else if (data.commissionType === 'FIXED_PER_TICKET') {
      if (!Number.isInteger(data.commissionValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El monto fijo por entrada debe expresarse en centavos (entero)',
          path: ['commissionValue'],
        });
      }
    }
    if (data.startAt && data.endAt) {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      if (start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startAt debe ser anterior a endAt',
          path: ['endAt'],
        });
      }
    }
  });
export type CreateReferralCommercialProposalInput = z.infer<typeof createReferralCommercialProposalSchema>;

export const referralCommercialProposalDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  producerProfileId: z.string(),
  referrerProfileId: z.string(),
  eventId: z.string(),
  commissionType: referralCommissionTypeSchema,
  commissionValue: z.number(),
  message: z.string().nullable(),
  terms: z.string().nullable(),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  status: referralCommercialProposalStatusSchema,
  respondedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  event: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      startAt: z.string().datetime(),
    })
    .optional(),
  referrerProfile: z
    .object({
      id: z.string(),
      displayName: z.string(),
      publicHandle: z.string().nullable(),
    })
    .optional(),
  producerProfile: z
    .object({
      id: z.string(),
      displayName: z.string(),
    })
    .optional(),
  agreement: z
    .object({
      id: z.string(),
      status: referralCommercialAgreementStatusSchema,
      acceptedAt: z.string().datetime(),
      referralLink: z.object({
        id: z.string(),
        code: z.string(),
        url: z.string(),
        label: z.string().nullable(),
      }),
    })
    .nullable()
    .optional(),
});
export type ReferralCommercialProposalDto = z.infer<typeof referralCommercialProposalDtoSchema>;

export const referralCommercialProposalListSchema = z.object({
  proposals: z.array(referralCommercialProposalDtoSchema),
});
export type ReferralCommercialProposalList = z.infer<typeof referralCommercialProposalListSchema>;

export const acceptReferralCommercialProposalResponseSchema = z.object({
  proposal: referralCommercialProposalDtoSchema,
  agreement: z.object({
    id: z.string(),
    status: referralCommercialAgreementStatusSchema,
    acceptedAt: z.string().datetime(),
    commissionType: referralCommissionTypeSchema,
    commissionValue: z.number(),
    referralLink: z.object({
      id: z.string(),
      code: z.string(),
      url: z.string(),
      label: z.string().nullable(),
    }),
    assignmentId: z.string().nullable(),
  }),
});
export type AcceptReferralCommercialProposalResponse = z.infer<
  typeof acceptReferralCommercialProposalResponseSchema
>;
