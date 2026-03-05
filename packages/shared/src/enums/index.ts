/**
 * Domain enums — shared across API, web, scanner
 * Enums de dominio — compartidos entre API, web, scanner
 */

export * from './role';
export * from './user-status';
export * from './error-codes';

export const EventStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  DELETED: 'deleted',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const TicketStatus = {
  VALID: 'valid',
  USED: 'used',
  REVOKED: 'revoked',
  REFUNDED: 'refunded',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const OrderStatus = {
  DRAFT: 'draft',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ScanResult = {
  OK: 'ok',
  ALREADY_USED: 'already_used',
  INVALID: 'invalid',
  REVOKED: 'revoked',
  OFFLINE_QUEUED: 'offline_queued',
} as const;

export type ScanResult = (typeof ScanResult)[keyof typeof ScanResult];
