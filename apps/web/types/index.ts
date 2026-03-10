/**
 * Domain types — inferred from lib/schemas (schemas are source of truth)
 */
export type {
  TicketStatus,
  Role,
  UserStatus,
  EventStatus,
  TicketTypeStatus,
  OrderStatus,
  TicketSource,
  CourtesyMode,
  ScanResult,
  Tenant,
  User,
  Event,
  TicketType,
  Order,
  Ticket,
  Review,
  ReferralLink,
  CourtesyGrant,
  TicketScanLog,
} from '@/lib/schemas/domain';

export {
  TicketStatusSchema,
  TenantSchema,
  UserSchema,
  EventSchema,
  TicketTypeSchema,
  OrderSchema,
  TicketSchema,
  ReviewSchema,
  ReferralLinkSchema,
  CourtesyGrantSchema,
  TicketScanLogSchema,
} from '@/lib/schemas/domain';
