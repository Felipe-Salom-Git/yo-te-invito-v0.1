/**
 * User role enum — RBAC
 * Rol de usuario — RBAC
 */

export const Role = {
  ADMIN: 'ADMIN',
  PRODUCER_OWNER: 'PRODUCER_OWNER',
  PRODUCER_STAFF: 'PRODUCER_STAFF',
  GASTRO_OWNER: 'GASTRO_OWNER',
  REFERRER: 'REFERRER',
  SCANNER: 'SCANNER',
  USER: 'USER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
