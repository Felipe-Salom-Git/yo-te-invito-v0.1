import { z } from 'zod';
import { referralCommissionSchema } from './events';

export const referralPaymentRequestStatusSchema = z.enum([
  'REQUESTED',
  'IN_REVIEW',
  'PAID',
  'REJECTED',
  'CANCELLED',
]);
export type ReferralPaymentRequestStatus = z.infer<typeof referralPaymentRequestStatusSchema>;

export const createReferralPaymentRequestSchema = z.object({
  commissionIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos una comisión'),
  message: z.string().trim().max(2000).optional(),
});
export type CreateReferralPaymentRequestInput = z.infer<typeof createReferralPaymentRequestSchema>;

export const rejectReferralPaymentRequestSchema = z.object({
  reason: z.string().trim().min(1, 'Indicá un motivo').max(2000),
});
export type RejectReferralPaymentRequestInput = z.infer<typeof rejectReferralPaymentRequestSchema>;

export const referralPaymentRequestCommissionDtoSchema = referralCommissionSchema.extend({
  eventTitle: z.string().optional(),
  referralCode: z.string().optional(),
});

export const referralPaymentRequestDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  referrerProfileId: z.string(),
  producerProfileId: z.string(),
  amountRequestedCents: z.number().int(),
  message: z.string().nullable(),
  status: referralPaymentRequestStatusSchema,
  rejectReason: z.string().nullable(),
  requestedAt: z.string().datetime(),
  inReviewAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  commissions: z.array(referralPaymentRequestCommissionDtoSchema).optional(),
});
export type ReferralPaymentRequestDto = z.infer<typeof referralPaymentRequestDtoSchema>;

export const referralPaymentRequestListSchema = z.object({
  paymentRequests: z.array(referralPaymentRequestDtoSchema),
});
export type ReferralPaymentRequestList = z.infer<typeof referralPaymentRequestListSchema>;

export const eligibleReferralCommissionDtoSchema = referralCommissionSchema.extend({
  eventTitle: z.string().optional(),
  referralCode: z.string().optional(),
  producerProfileId: z.string().nullable().optional(),
  producerDisplayName: z.string().optional(),
});

export const eligibleReferralCommissionsListSchema = z.object({
  commissions: z.array(eligibleReferralCommissionDtoSchema),
});
export type EligibleReferralCommissionsList = z.infer<typeof eligibleReferralCommissionsListSchema>;
