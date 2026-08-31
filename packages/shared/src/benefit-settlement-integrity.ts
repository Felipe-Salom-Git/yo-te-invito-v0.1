/**
 * Benefit settlement integrity checks — read-only drift detection.
 * Reuses detectBarterCreditDrift from courtesy-credit-ledger.
 */

import {
  computeCashDueCents,
  computeCashReceivedCents,
} from './benefit-settlement';
import {
  type BarterCreditDriftIssue,
  computeCourtesyCreditBalanceCents,
  detectBarterCreditDrift,
} from './courtesy-credit-ledger';
import type { BenefitIntegrityIssue } from './benefit-settlement-reporting';

export function barterDriftToIntegrityIssues(
  drift: BarterCreditDriftIssue[],
): BenefitIntegrityIssue[] {
  return drift.map((issue) => {
    switch (issue.kind) {
      case 'ALLOCATION_WITHOUT_CREDIT':
        return {
          code: 'BARTER_ALLOCATION_WITHOUT_CREDIT',
          severity: 'ERROR',
          message: '1 allocation BARTER sin crédito materializado',
          entityType: 'BenefitSettlementUsageAllocation',
          entityId: issue.allocationId,
        };
      case 'DUPLICATE_CREDIT':
        return {
          code: 'BARTER_DUPLICATE_CREDIT',
          severity: 'ERROR',
          message: 'Crédito duplicado para allocation BARTER',
          entityType: 'BenefitSettlementUsageAllocation',
          entityId: issue.allocationId,
        };
      case 'CREDIT_AMOUNT_MISMATCH':
        return {
          code: 'BARTER_CREDIT_AMOUNT_MISMATCH',
          severity: 'ERROR',
          message: `Diferencia de materialización de crédito (esperado ${issue.expectedCents}, actual ${issue.actualCents})`,
          entityType: 'BenefitSettlementUsageAllocation',
          entityId: issue.allocationId,
        };
      case 'CREDIT_WITHOUT_BARTER_ALLOCATION':
        return {
          code: 'BARTER_ORPHAN_CREDIT',
          severity: 'ERROR',
          message: 'Crédito huérfano sin allocation BARTER',
          entityType: 'CourtesyCreditLedgerEntry',
          entityId: issue.entryId,
        };
      default:
        return {
          code: 'BARTER_DRIFT_UNKNOWN',
          severity: 'ERROR',
          message: 'Inconsistencia de canje detectada',
        };
    }
  });
}

export function checkCashOverpayment(
  allocations: ReadonlyArray<{ mode: string; baseAmountCents: bigint }>,
  transfers: ReadonlyArray<{ amountCents: bigint; reversedAt?: Date | null }>,
  settlementId: string,
): BenefitIntegrityIssue | null {
  const cashDue = computeCashDueCents(allocations);
  const cashReceived = computeCashReceivedCents(transfers);
  if (cashReceived > cashDue) {
    return {
      code: 'CASH_OVERPAYMENT',
      severity: 'ERROR',
      message: 'Transferencias activas superan el cash due de la liquidación',
      entityType: 'BenefitSettlement',
      entityId: settlementId,
    };
  }
  return null;
}

export function checkNegativeCourtesyBalance(
  entries: ReadonlyArray<{ amountCents: bigint }>,
  partnerLabel: string,
): BenefitIntegrityIssue | null {
  const balance = computeCourtesyCreditBalanceCents(entries);
  if (balance < 0n) {
    return {
      code: 'NEGATIVE_COURTESY_BALANCE',
      severity: 'ERROR',
      message: `Saldo de canje negativo para ${partnerLabel}`,
    };
  }
  return null;
}

export function checkClosedWithPendingUsages(
  status: string,
  pendingUsageCount: number,
  settlementId: string,
): BenefitIntegrityIssue | null {
  if (status === 'CLOSED' && pendingUsageCount > 0) {
    return {
      code: 'CLOSED_WITH_PENDING_USAGES',
      severity: 'ERROR',
      message: 'Liquidación cerrada con usos pendientes de asignar',
      entityType: 'BenefitSettlement',
      entityId: settlementId,
    };
  }
  return null;
}

export function checkDuplicateSettlement(
  settlementIds: string[],
  partnerLabel: string,
): BenefitIntegrityIssue | null {
  if (settlementIds.length > 1) {
    return {
      code: 'DUPLICATE_SETTLEMENT',
      severity: 'ERROR',
      message: `Más de una liquidación para ${partnerLabel} en el mismo período`,
    };
  }
  return null;
}

export function checkCurrencyMismatch(
  currencies: string[],
  entityType: string,
  entityId: string,
): BenefitIntegrityIssue | null {
  const unique = [...new Set(currencies.filter(Boolean))];
  if (unique.length > 1) {
    return {
      code: 'CURRENCY_MISMATCH',
      severity: 'ERROR',
      message: 'Múltiples monedas en la misma liquidación',
      entityType,
      entityId,
    };
  }
  return null;
}

export function checkBarterExpectedVsMaterialized(
  expectedCents: string | undefined,
  materializedCents: string | undefined,
  settlementId: string,
): BenefitIntegrityIssue | null {
  if (
    expectedCents != null &&
    materializedCents != null &&
    expectedCents !== materializedCents
  ) {
    return {
      code: 'BARTER_EXPECTED_MATERIALIZED_DRIFT',
      severity: 'ERROR',
      message: 'Hay una diferencia entre crédito esperado y materializado',
      entityType: 'BenefitSettlement',
      entityId: settlementId,
    };
  }
  return null;
}

export function runBarterCreditDriftCheck(params: {
  barterAllocations: ReadonlyArray<{
    id: string;
    baseAmountCents: bigint;
    barterMultiplier: string;
    mode: string;
  }>;
  creditEntries: ReadonlyArray<{
    id: string;
    type: string;
    amountCents: bigint;
    sourceAllocationId: string | null;
  }>;
}): BenefitIntegrityIssue[] {
  return barterDriftToIntegrityIssues(
    detectBarterCreditDrift({
      barterAllocations: params.barterAllocations,
      creditEntries: params.creditEntries,
    }),
  );
}

export function benefitValidationAllocationKey(
  validationSource: string,
  validationId: string,
): string {
  return `${validationSource}:${validationId}`;
}

export function checkOrphanAllocation(params: {
  allocationId: string;
  validationSource: string;
  validationId: string;
  validationExists: boolean;
}): BenefitIntegrityIssue | null {
  if (params.validationExists) return null;
  return {
    code: 'ORPHAN_ALLOCATION',
    severity: 'ERROR',
    message: `Allocation referencia una validación inexistente (${params.validationSource})`,
    entityType: 'BenefitSettlementUsageAllocation',
    entityId: params.allocationId,
  };
}

export function checkPartnerMismatchAllocation(params: {
  allocationId: string;
  settlementVertical: 'GASTRO' | 'ACTIVITY';
  settlementGastroProfileId: string | null;
  settlementExcursionOperatorId: string | null;
  validationGastroProfileId: string | null;
  validationExcursionOperatorId: string | null;
}): BenefitIntegrityIssue | null {
  if (params.settlementVertical === 'GASTRO') {
    if (
      params.validationGastroProfileId != null &&
      params.settlementGastroProfileId != null &&
      params.validationGastroProfileId !== params.settlementGastroProfileId
    ) {
      return {
        code: 'PARTNER_MISMATCH',
        severity: 'ERROR',
        message: 'La validación asignada pertenece a otro partner gastronómico',
        entityType: 'BenefitSettlementUsageAllocation',
        entityId: params.allocationId,
      };
    }
    return null;
  }
  if (
    params.validationExcursionOperatorId != null &&
    params.settlementExcursionOperatorId != null &&
    params.validationExcursionOperatorId !== params.settlementExcursionOperatorId
  ) {
    return {
      code: 'PARTNER_MISMATCH',
      severity: 'ERROR',
      message: 'La validación asignada pertenece a otro operador',
      entityType: 'BenefitSettlementUsageAllocation',
      entityId: params.allocationId,
    };
  }
  return null;
}
