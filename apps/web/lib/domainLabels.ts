/**
 * Centralized domain status labels and badge style mappings.
 * Prevents inconsistent strings across components.
 */

// ─── Ticket status ────────────────────────────────────────────────────────

export type TicketStatus = 'VALID' | 'USED' | 'REVOKED';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  VALID: 'Válido',
  USED: 'Usado',
  REVOKED: 'Revocado',
};

export const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  VALID: 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  USED: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  REVOKED: 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-400',
};

// ─── Order status ─────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'paid' | 'CANCELLED' | 'REFUNDED';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  paid: 'Pagado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-500/20 text-amber-600',
  PAID: 'bg-emerald-500/20 text-emerald-600',
  paid: 'bg-emerald-500/20 text-emerald-600',
  CANCELLED: 'bg-red-500/20 text-red-600',
  REFUNDED: 'bg-border text-text-muted',
};

// ─── Scan result ──────────────────────────────────────────────────────────

export type ScanResult = 'OK' | 'ALREADY_USED' | 'REVOKED' | 'INVALID';

export const SCAN_RESULT_LABELS: Record<ScanResult, string> = {
  OK: 'OK',
  ALREADY_USED: 'Ya usado',
  REVOKED: 'Revocado',
  INVALID: 'Inválido',
};

export const SCAN_RESULT_STYLES: Record<ScanResult, string> = {
  OK: 'bg-emerald-500/20 text-emerald-600',
  ALREADY_USED: 'bg-amber-500/20 text-amber-600',
  REVOKED: 'bg-red-500/20 text-red-600',
  INVALID: 'bg-red-500/20 text-red-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getTicketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status;
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function getScanResultLabel(result: string): string {
  return SCAN_RESULT_LABELS[result as ScanResult] ?? result;
}
