import type { BenefitCashCollectionStatus, BenefitSettlementStatus } from './benefit-settlement';
import { ErrorCode } from './enums/error-codes';
import { formatBenefitMoneyCents } from './money/benefit-money';

export const BENEFIT_SETTLEMENT_STATUS_LABEL: Record<BenefitSettlementStatus, string> = {
  OPEN: 'Abierta',
  PARTIALLY_ALLOCATED: 'Parcialmente asignada',
  ALLOCATED: 'Asignada',
  CLOSED: 'Cerrada',
};

export const BENEFIT_CASH_COLLECTION_STATUS_LABEL: Record<BenefitCashCollectionStatus, string> = {
  NONE: 'Sin cash',
  PENDING: 'Transferencia pendiente',
  PARTIALLY_RECEIVED: 'Transferencia parcial',
  RECEIVED: 'Transferencia recibida',
};

const MONTH_NAMES_AR = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export function formatBenefitSettlementPeriodLabel(periodKey: string): string {
  const match = periodKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return periodKey;
  const year = match[1]!;
  const monthIndex = Number(match[2]!) - 1;
  const month = MONTH_NAMES_AR[monthIndex];
  if (!month) return periodKey;
  return `${month} ${year}`;
}

export const BENEFIT_SETTLEMENT_ERROR_MESSAGES: Partial<Record<string, string>> = {
  [ErrorCode.BENEFIT_SETTLEMENT_MISSING_AGREEMENTS]:
    'Hay validaciones sin acuerdo comercial vigente. Revisá los acuerdos antes de continuar.',
  [ErrorCode.BENEFIT_SETTLEMENT_ALLOCATION_CONFLICT]:
    'Uno o más usos ya fueron asignados económicamente. Actualizá la liquidación e intentá de nuevo.',
  [ErrorCode.BENEFIT_SETTLEMENT_NO_CASH_DUE]:
    'Esta liquidación no tiene montos en transferencia (CASH) para registrar.',
  [ErrorCode.BENEFIT_TRANSFER_OVERPAYMENT]:
    'El importe supera el saldo pendiente de transferencia.',
  [ErrorCode.BENEFIT_TRANSFER_ALREADY_REVERSED]:
    'Esta transferencia ya fue revertida.',
  [ErrorCode.BENEFIT_CREDIT_INSUFFICIENT_BALANCE]:
    'Saldo de canje insuficiente para esta operación.',
  [ErrorCode.BENEFIT_CREDIT_ALREADY_REVERSED]:
    'Este movimiento de crédito ya fue revertido.',
  [ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED]:
    'La liquidación ya está cerrada.',
  [ErrorCode.BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES]:
    'No hay suficientes usos pendientes de asignar.',
};

export function mapBenefitSettlementErrorMessage(
  error: unknown,
  fallback = 'No se pudo completar la operación.',
): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
    if (code && BENEFIT_SETTLEMENT_ERROR_MESSAGES[code]) {
      return BENEFIT_SETTLEMENT_ERROR_MESSAGES[code]!;
    }
    if ('message' in error && typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export const COURTESY_LEDGER_ENTRY_TYPE_LABEL: Record<string, string> = {
  CREDIT_FROM_SETTLEMENT: 'Crédito por liquidación',
  DEBIT_COURTESY: 'Cortesía',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reversión',
};

/** Proportional base estimate for oldest-first allocation preview (non-authoritative). */
export function estimatePendingAllocationBaseCents(
  pendingBaseAmountCents: string,
  pendingUsageCount: number,
  count: number,
): string {
  if (pendingUsageCount <= 0 || count <= 0) return '0';
  return ((BigInt(pendingBaseAmountCents) * BigInt(count)) / BigInt(pendingUsageCount)).toString();
}

export function formatSignedBenefitMoneyCents(cents: string, currency = 'ARS'): string {
  const negative = cents.startsWith('-');
  const abs = negative ? cents.slice(1) : cents;
  const formatted = formatBenefitMoneyCents(abs, currency);
  return negative ? `−${formatted}` : formatted;
}

/** CLOSED freezes usages; it does not mean cash was fully collected. */
export function isBenefitSettlementClosedBadge(status: BenefitSettlementStatus): boolean {
  return status === 'CLOSED';
}

export const BENEFIT_INTEGRITY_STATUS_LABEL: Record<
  import('./benefit-settlement-reporting').BenefitIntegrityStatus,
  string
> = {
  OK: 'Integridad OK',
  WARNING: 'Requiere revisión',
  ERROR: 'Inconsistencia detectada',
};
