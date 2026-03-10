import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────────────────

export const TicketStatusSchema = z.enum(['VALID', 'USED', 'REVOKED']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const RoleSchema = z.enum([
  'ADMIN',
  'PRODUCER_OWNER',
  'PRODUCER_STAFF',
  'GASTRO_OWNER',
  'REFERRER',
  'SCANNER',
  'USER',
]);
export type Role = z.infer<typeof RoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const EventStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'APPROVED',
  'PAUSED',
  'CANCELLED',
]);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const TicketTypeStatusSchema = z.enum(['ACTIVE', 'PAUSED']);
export type TicketTypeStatus = z.infer<typeof TicketTypeStatusSchema>;

export const OrderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const TicketSourceSchema = z.enum(['ORDER', 'COURTESY']);
export type TicketSource = z.infer<typeof TicketSourceSchema>;

export const CourtesyModeSchema = z.enum(['CONSUMES_BATCH', 'FREE_CAPACITY']);
export type CourtesyMode = z.infer<typeof CourtesyModeSchema>;

export const ScanResultSchema = z.enum(['OK', 'ALREADY_USED', 'INVALID', 'REVOKED']);
export type ScanResult = z.infer<typeof ScanResultSchema>;

// ─── Common ──────────────────────────────────────────────────────────────

/** ISO datetime string from API responses */
const dateSchema = z.string();
const nullableDateSchema = z.string().nullable();

// ─── Tenant ──────────────────────────────────────────────────────────────

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: nullableDateSchema,
});
export type Tenant = z.infer<typeof TenantSchema>;

// ─── User ────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  role: RoleSchema,
  status: UserStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: nullableDateSchema,
});
export type User = z.infer<typeof UserSchema>;

// ─── Event ───────────────────────────────────────────────────────────────

export const EventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  producerId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startAt: dateSchema,
  endAt: nullableDateSchema,
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  status: EventStatusSchema,
  capacityTotal: z.number().nullable(),
  coverImageUrl: z.string().nullable(),
  isTicketingEnabled: z.boolean(),
  ratingAvg: z.number().nullable(),
  ratingCount: z.number(),
  publishedAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: nullableDateSchema,
});
export type Event = z.infer<typeof EventSchema>;

// ─── TicketType ──────────────────────────────────────────────────────────

export const TicketTypeSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string()]),
  currency: z.string(),
  capacityTotal: z.number(),
  capacityAvailable: z.number(),
  maxPerOrder: z.number(),
  salesStartAt: nullableDateSchema,
  salesEndAt: nullableDateSchema,
  status: TicketTypeStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: nullableDateSchema,
});
export type TicketType = z.infer<typeof TicketTypeSchema>;

// ─── Order ───────────────────────────────────────────────────────────────

export const OrderSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  status: OrderStatusSchema,
  buyerEmail: z.string(),
  buyerFirstName: z.string(),
  buyerLastName: z.string(),
  buyerDocument: z.string().nullable(),
  totalAmount: z.union([z.number(), z.string()]),
  currency: z.string(),
  expiresAt: nullableDateSchema,
  expiredAt: nullableDateSchema,
  paidAt: nullableDateSchema,
  cancelledAt: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Order = z.infer<typeof OrderSchema>;

// ─── Ticket ──────────────────────────────────────────────────────────────

export const TicketSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  orderItemId: z.string().nullable(),
  ticketTypeId: z.string().nullable(),
  eventId: z.string(),
  qrPayload: z.string(),
  status: TicketStatusSchema,
  source: TicketSourceSchema,
  ownerUserId: z.string().nullable(),
  usedAt: nullableDateSchema,
  revokedAt: nullableDateSchema,
  revokedByUserId: z.string().nullable(),
  revokedReason: z.string().nullable(),
  revokedNote: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Ticket = z.infer<typeof TicketSchema>;

// ─── Review ──────────────────────────────────────────────────────────────

export const ReviewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  userId: z.string(),
  score: z.number(),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  createdAt: dateSchema,
});
export type Review = z.infer<typeof ReviewSchema>;

// ─── ReferralLink ────────────────────────────────────────────────────────

export const ReferralLinkSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  code: z.string(),
  referrerId: z.string().nullable(),
  label: z.string().nullable(),
  createdAt: dateSchema,
});
export type ReferralLink = z.infer<typeof ReferralLinkSchema>;

// ─── CourtesyGrant ───────────────────────────────────────────────────────

export const CourtesyGrantSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  ticketTypeId: z.string().nullable(),
  mode: CourtesyModeSchema,
  quantity: z.number(),
  issued: z.number(),
  note: z.string().nullable(),
  createdById: z.string(),
  createdAt: dateSchema,
});
export type CourtesyGrant = z.infer<typeof CourtesyGrantSchema>;

// ─── TicketScanLog ───────────────────────────────────────────────────────

export const TicketScanLogSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  ticketId: z.string().nullable(),
  qrPayload: z.string(),
  deviceId: z.string().nullable(),
  scannerId: z.string().nullable(),
  result: ScanResultSchema,
  createdAt: dateSchema,
});
export type TicketScanLog = z.infer<typeof TicketScanLogSchema>;
