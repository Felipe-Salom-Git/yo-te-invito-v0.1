import { z } from 'zod';

const RelationshipStatusEnum = z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED']);
const RelationshipOriginEnum = z.enum([
  'REQUESTED_BY_REFERRER',
  'INVITED_BY_PRODUCER',
  'FREELANCE_CONTACT',
  'REQUESTED_BY_REFERRER_LINK',
  'DISCOVERED_IN_FREELANCE_LIST',
]);

export const requestAssociationSchema = z.object({
    referrerProfileId: z.string().cuid(),
    notes: z.string().optional(),
    origin: RelationshipOriginEnum.default('INVITED_BY_PRODUCER'),
});
export type RequestAssociationInput = z.infer<typeof requestAssociationSchema>;

export const updateAssociationStatusSchema = z.object({
    status: RelationshipStatusEnum,
    notes: z.string().optional(),
});
export type UpdateAssociationStatusInput = z.infer<typeof updateAssociationStatusSchema>;

export const assignReferrerToEventSchema = z.object({
    referrerProfileId: z.string().cuid(),
    courtesyQuota: z.coerce.number().int().min(0).default(0),
});
export type AssignReferrerToEventInput = z.infer<typeof assignReferrerToEventSchema>;

const eventAssignmentStatusEnum = z.enum(['ACTIVE', 'PAUSED', 'CANCELED']);

export const eventReferrerAssignmentDtoSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  referrerProfileId: z.string(),
  status: eventAssignmentStatusEnum,
  courtesyQuota: z.number(),
  courtesyUsedCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EventReferrerAssignmentDto = z.infer<typeof eventReferrerAssignmentDtoSchema>;

export const assignReferrerToEventResponseSchema = z.object({
  assignment: eventReferrerAssignmentDtoSchema,
  referralLink: z.object({
    id: z.string(),
    code: z.string(),
    url: z.string(),
    label: z.string().nullable(),
  }),
  /** true si ya existía fila operativa (ACTIVE/PAUSED); no se creó duplicado */
  alreadyAssigned: z.boolean(),
});
export type AssignReferrerToEventResponse = z.infer<typeof assignReferrerToEventResponseSchema>;

export const producerEventAssignmentListItemSchema = z.object({
  assignment: eventReferrerAssignmentDtoSchema,
  referrerProfile: z.object({
    id: z.string(),
    displayName: z.string(),
    publicHandle: z.string().nullable(),
    salesScore: z.number().nullable(),
    completedSales: z.number(),
  }),
  referralLink: z
    .object({
      id: z.string(),
      code: z.string(),
      url: z.string(),
      label: z.string().nullable(),
      attributedOrdersCount: z.number(),
    })
    .nullable(),
});
export type ProducerEventAssignmentListItem = z.infer<typeof producerEventAssignmentListItemSchema>;

export const producerEventAssignmentsResponseSchema = z.object({
  assignments: z.array(producerEventAssignmentListItemSchema),
});
export type ProducerEventAssignmentsResponse = z.infer<typeof producerEventAssignmentsResponseSchema>;

export const referrerDashboardAssignedEventSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  startAt: z.string(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  /** Estado del evento en catálogo (DRAFT, APPROVED, …) */
  eventStatus: z.string(),
  assignmentStatus: eventAssignmentStatusEnum,
  referralCode: z.string().nullable(),
  referralLinkId: z.string().nullable(),
  courtesyQuota: z.number(),
  courtesyUsedCount: z.number(),
  /** Pedidos atribuidos a tus links con pago confirmado (PAID) */
  paidAttributedOrdersCount: z.number(),
  ticketsSoldCount: z.number(),
  /** Suma de totalAmount de esos pedidos (centavos, moneda del pedido) */
  grossRevenueFromReferralsCents: z.number(),
});
export type ReferrerDashboardAssignedEvent = z.infer<typeof referrerDashboardAssignedEventSchema>;

/** Link de venta propio (perfil o usuario legacy) con métricas agregadas */
export const referrerDashboardSaleLinkSchema = z.object({
  id: z.string(),
  code: z.string(),
  url: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventStatus: z.string(),
  /** Todas las atribuciones registradas (incluye pedidos no pagados) */
  attributedOrdersTotalCount: z.number(),
  paidAttributedOrdersCount: z.number(),
  ticketsSoldCount: z.number(),
  grossRevenueFromReferralsCents: z.number(),
});
export type ReferrerDashboardSaleLink = z.infer<typeof referrerDashboardSaleLinkSchema>;

export const getReferrersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: RelationshipStatusEnum.optional(),
});
export type GetReferrersQuery = z.infer<typeof getReferrersQuerySchema>;

const slugPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const referrerProfilePatchSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(slugPattern, 'slug: solo minúsculas, números y guiones')
    .optional()
    .nullable(),
  publicHandle: z.string().max(80).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  longBio: z.string().max(5000).optional().nullable(),
  avatarUrl: z.string().max(2048).optional().nullable(),
  coverImageUrl: z.string().max(2048).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  publicVisibility: z.boolean().optional(),
});
export type ReferrerProfilePatchInput = z.infer<typeof referrerProfilePatchSchema>;

export const publicReferrersListQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type PublicReferrersListQuery = z.infer<typeof publicReferrersListQuerySchema>;

export const publicReferrerBySlugQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type PublicReferrerBySlugQuery = z.infer<typeof publicReferrerBySlugQuerySchema>;

export const publicReferrerAssociationResolveQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type PublicReferrerAssociationResolveQuery = z.infer<typeof publicReferrerAssociationResolveQuerySchema>;

export const producerAssociationFromLinkSchema = z.object({
  token: z.string().min(8).max(128),
});
export type ProducerAssociationFromLinkInput = z.infer<typeof producerAssociationFromLinkSchema>;

export const producerFreelanceAssociationRequestSchema = z.object({
  referrerProfileId: z.string().cuid(),
});
export type ProducerFreelanceAssociationRequestInput = z.infer<
  typeof producerFreelanceAssociationRequestSchema
>;

/** Query GET /producer/referrers/freelance */
export const producerFreelanceReferrersQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  sort: z
    .enum(['default', 'recent', 'name_asc', 'name_desc', 'activity', 'assigned_events', 'completed_sales'])
    .optional()
    .default('default'),
  /** Relación con la productora actual (sin perfil productor se ignora) */
  relationship: z.enum(['any', 'none', 'active', 'pending', 'closed']).optional().default('any'),
  /** Actividad según completedSales del perfil (dato persistido) */
  activity: z.enum(['any', 'with_sales', 'no_sales']).optional().default('any'),
  /** Asignaciones a eventos ACTIVE (cualquier productora) */
  assignedEvents: z.enum(['any', 'with', 'without']).optional().default('any'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(60),
});
export type ProducerFreelanceReferrersQuery = z.infer<typeof producerFreelanceReferrersQuerySchema>;

/** Referrer accepts or rejects a producer-initiated pending association */
export const referrerRespondProducerAssociationSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
  notes: z.string().max(500).optional(),
});
export type ReferrerRespondProducerAssociationInput = z.infer<
  typeof referrerRespondProducerAssociationSchema
>;
