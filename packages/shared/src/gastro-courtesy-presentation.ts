/**
 * G8.9 / G8.10 — Pure presentation rules for courtesies (owner portal + ADMIN).
 *
 * A courtesy reuses the `GastroDiscount` lifecycle (no new enum). These helpers map that
 * lifecycle to human states and decide which actions are valid, so the portal and the admin
 * never expose raw enums nor actions the backend would reject.
 * Reglas puras de presentación de cortesías (portal owner + ADMIN); sin enums crudos ni
 * acciones inválidas.
 */
import { isGastroDiscountExpired } from './gastro-discount-expiry';
import { isCourtesyPendingApproval } from './gastro-courtesy-lifecycle';

export type CourtesyDisplayState =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ARCHIVED';

export const GASTRO_COURTESY_STATE_LABELS: Record<CourtesyDisplayState, string> = {
  PENDING: 'Pendiente de aprobación',
  ACTIVE: 'Activa',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
  ARCHIVED: 'Archivada',
};

type DateLike = Date | string | null | undefined;

function toDate(value: DateLike): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CourtesyStateInput = {
  status: string;
  archivedAt?: DateLike;
  validTo?: DateLike;
};

/**
 * Human state of a courtesy campaign. An ACTIVE/APPROVED courtesy past its `validTo` is
 * shown as "Vencida" even before the expiry cron flips its status.
 */
export function resolveCourtesyDisplayState(
  input: CourtesyStateInput,
  now: Date = new Date(),
): CourtesyDisplayState {
  if (input.archivedAt) return 'ARCHIVED';
  if (isCourtesyPendingApproval(input.status)) return 'PENDING';
  switch (input.status) {
    case 'REJECTED':
      return 'REJECTED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'ACTIVE':
    case 'APPROVED':
      return isGastroDiscountExpired(toDate(input.validTo), now) ? 'EXPIRED' : 'ACTIVE';
    default:
      return 'CANCELLED';
  }
}

export function courtesyDisplayStateLabel(input: CourtesyStateInput, now?: Date): string {
  return GASTRO_COURTESY_STATE_LABELS[resolveCourtesyDisplayState(input, now)];
}

/**
 * An ADMIN-created courtesy (possibly funded with Courtesy Credit, D2) is administered by
 * ADMIN only: the owner cannot cancel it. Owner-created courtesies stay owner-cancellable.
 */
export function canOwnerChangeCourtesyStatus(createdByOrigin: string | null | undefined): boolean {
  return createdByOrigin !== 'ADMIN';
}

export const GASTRO_COURTESY_ADMIN_ORIGIN_OWNER_BLOCKED_MESSAGE =
  'Esta cortesía fue creada por administración. Solo administración puede cancelarla.';

// ---------------------------------------------------------------------------
// G8.10.7 — Audit labels (same AuditLog rows / actions; only the human label changes)
// ---------------------------------------------------------------------------

/**
 * Courtesy operations reuse the `GASTRO_DISCOUNT_*` audit actions (entity stays
 * `GastroDiscount` + canonical id). These labels avoid calling them "descuento".
 */
export const GASTRO_COURTESY_AUDIT_ACTION_LABELS: Record<string, string> = {
  GASTRO_DISCOUNT_COURTESY_CREATED: 'Cortesía gastro solicitada',
  GASTRO_DISCOUNT_COURTESY_SENT: 'Entrega de cortesía gastro',
  BENEFIT_CREDIT_DEBITED_FOR_COURTESY: 'Crédito de canje debitado por cortesía',
  GASTRO_DISCOUNT_COMMISSION_NEGOTIATION: 'Cortesía gastro en coordinación',
  GASTRO_DISCOUNT_APPROVED: 'Cortesía gastro aprobada',
  GASTRO_DISCOUNT_REJECTED: 'Cortesía gastro rechazada',
  GASTRO_DISCOUNT_CANCELLED: 'Cortesía gastro cancelada',
  GASTRO_DISCOUNT_ACTIVATED: 'Cortesía gastro activada',
  GASTRO_DISCOUNT_ARCHIVED: 'Cortesía gastro archivada',
  GASTRO_DISCOUNT_UNARCHIVED: 'Cortesía gastro restaurada del archivo',
  GASTRO_DISCOUNT_EDIT_APPROVED: 'Edición de cortesía gastro aprobada',
  GASTRO_DISCOUNT_EDIT_REJECTED: 'Edición de cortesía gastro rechazada',
};

const COURTESY_WITHDRAWN_LABEL = 'Solicitud de cortesía retirada por el local';

function readFlag(value: unknown, key: string): boolean {
  return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>)[key] === true);
}

export type AuditEntryRef = {
  action: string;
  entityType?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

/** True when the audit row is about a courtesy (flag written by the courtesy flows). */
export function isCourtesyAuditEntry(entry: AuditEntryRef): boolean {
  if (entry.action.startsWith('GASTRO_DISCOUNT_COURTESY_')) return true;
  if (entry.action === 'BENEFIT_CREDIT_DEBITED_FOR_COURTESY') return true;
  if (entry.entityType === 'GastroCourtesyCampaign') return true;
  return readFlag(entry.after, 'courtesy') || readFlag(entry.metadata, 'courtesy');
}

/** Courtesy-aware label, or null when the entry is not a courtesy (use the generic one). */
export function resolveCourtesyAuditActionLabel(entry: AuditEntryRef): string | null {
  if (!isCourtesyAuditEntry(entry)) return null;
  if (
    entry.action === 'GASTRO_DISCOUNT_CANCELLED' &&
    readFlag(entry.metadata, 'pendingRequestWithdrawn')
  ) {
    return COURTESY_WITHDRAWN_LABEL;
  }
  return GASTRO_COURTESY_AUDIT_ACTION_LABELS[entry.action] ?? null;
}

export type CourtesyActor = 'OWNER' | 'ADMIN';

export type CourtesyActions = {
  /** Owner withdraws a request still pending approval ("Cancelar solicitud"). */
  cancelRequest: boolean;
  /** Terminal cancel of an approved, still valid campaign (claims → CANCELLED). */
  cancelCampaign: boolean;
  /** Unified Studio (G8.7): only while the campaign can still be seen/used. */
  editDesign: boolean;
  approve: boolean;
  reject: boolean;
  markNegotiation: boolean;
  /** Retry delivery of approved claims that never got their email. */
  redeliver: boolean;
  /** Courtesies never own a master QR (G8.2): never offered. */
  sendMasterQrEmail: false;
  /** Courtesies are immutable after the request (G8.2): never offered. */
  edit: false;
};

export function resolveCourtesyActions(
  input: CourtesyStateInput & {
    actor: CourtesyActor;
    createdByOrigin?: string | null;
    pendingDeliveryClaims?: number;
  },
  now?: Date,
): CourtesyActions {
  const state = resolveCourtesyDisplayState(input, now);
  const isAdmin = input.actor === 'ADMIN';
  const pending = state === 'PENDING';
  const active = state === 'ACTIVE';
  return {
    cancelRequest:
      !isAdmin && pending && canOwnerChangeCourtesyStatus(input.createdByOrigin),
    cancelCampaign: active && (isAdmin || canOwnerChangeCourtesyStatus(input.createdByOrigin)),
    editDesign: pending || active,
    approve: isAdmin && pending,
    reject: isAdmin && pending,
    markNegotiation: isAdmin && input.status === 'PENDING_REVIEW' && !input.archivedAt,
    redeliver: isAdmin && active && (input.pendingDeliveryClaims ?? 0) > 0,
    sendMasterQrEmail: false,
    edit: false,
  };
}
