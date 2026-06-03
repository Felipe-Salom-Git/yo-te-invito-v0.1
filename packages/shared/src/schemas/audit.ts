import { z } from 'zod';

/** Prisma AuditAction — keep in sync with schema.prisma */
export const auditActionSchema = z.enum([
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'EVENT_POSTPONED',
  'EVENT_CANCELLED',
  'TICKET_REVOKED',
  'ORDER_EXPIRED',
  'TICKET_TRANSFERRED',
  'RESALE_LISTED',
  'RESALE_SOLD',
  'PAYOUT_STATUS_CHANGED',
  'GASTRO_DISCOUNT_COMMISSION_NEGOTIATION',
  'GASTRO_DISCOUNT_APPROVED',
  'GASTRO_DISCOUNT_REJECTED',
  'GASTRO_DISCOUNT_CANCELLED',
  'GASTRO_DISCOUNT_ACTIVATED',
  'GASTRO_DISCOUNT_QR_EMAIL_SENT',
  'REVIEW_DISPUTE_IN_REVIEW',
  'REVIEW_DISPUTE_ACCEPTED',
  'REVIEW_DISPUTE_REJECTED',
  'REVIEW_DISPUTE_RESOLVED',
  'REVIEW_HIDDEN',
  'REVIEW_RESTORED',
  'REVIEW_REPLY_UPDATED',
  'REFERRAL_PAYMENT_REQUEST_CREATED',
  'REFERRAL_PAYMENT_REQUEST_STATUS_CHANGED',
  'LEGAL_DOCUMENT_CREATED',
  'LEGAL_DOCUMENT_UPDATED',
  'LEGAL_DOCUMENT_DRAFT_SAVED',
  'LEGAL_DOCUMENT_PUBLISHED',
  'LEGAL_DOCUMENT_ARCHIVED',
  'PAYMENT_ADMIN_RECONCILED',
  'PAYMENT_MANUAL_REVIEWED',
]);
export type AuditActionValue = z.infer<typeof auditActionSchema>;

export const auditLogsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().max(200).optional(),
    action: auditActionSchema.optional(),
    entityType: z.string().max(80).optional(),
    actorUserId: z.string().min(1).optional(),
    actorEmail: z.string().max(200).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    },
    { message: 'dateFrom must not be greater than dateTo', path: ['dateFrom'] },
  );

export type AuditLogsListQuery = z.infer<typeof auditLogsListQuerySchema>;

export const auditLogItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
  /** Resolved from User when available */
  actorEmail: z.string().nullable().optional(),
  actorDisplayName: z.string().nullable().optional(),
  /** Short human-readable line for operations UI */
  summary: z.string().optional(),
});

export type AuditLogItem = z.infer<typeof auditLogItemSchema>;

export const auditLogsListResponseSchema = z.object({
  data: z.array(auditLogItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type AuditLogsListResponse = z.infer<typeof auditLogsListResponseSchema>;
