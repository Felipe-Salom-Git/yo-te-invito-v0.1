/**
 * Benefit settlement admin UI helpers (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-admin-ui
 */

import { ErrorCode } from '@yo-te-invito/shared';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  BENEFIT_SETTLEMENT_ERROR_MESSAGES,
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  COURTESY_LEDGER_ENTRY_TYPE_LABEL,
  estimatePendingAllocationBaseCents,
  formatBenefitSettlementPeriodLabel,
  formatSignedBenefitMoneyCents,
  isBenefitSettlementClosedBadge,
  mapBenefitSettlementErrorMessage,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(formatBenefitSettlementPeriodLabel('2026-08') === 'Agosto 2026', 'period label AR');
assert(
  BENEFIT_SETTLEMENT_STATUS_LABEL.CLOSED === 'Cerrada',
  'CLOSED label is Cerrada not Pagado',
);
assert(
  BENEFIT_CASH_COLLECTION_STATUS_LABEL.RECEIVED === 'Transferencia recibida',
  'cash collection separate from settlement status',
);
assert(isBenefitSettlementClosedBadge('CLOSED'), 'CLOSED is closed badge');
assert(!isBenefitSettlementClosedBadge('OPEN'), 'OPEN is not closed badge');

assert(
  mapBenefitSettlementErrorMessage({ code: ErrorCode.BENEFIT_TRANSFER_OVERPAYMENT }) ===
    BENEFIT_SETTLEMENT_ERROR_MESSAGES[ErrorCode.BENEFIT_TRANSFER_OVERPAYMENT],
  'overpayment error mapped',
);
assert(
  mapBenefitSettlementErrorMessage({ code: ErrorCode.BENEFIT_SETTLEMENT_MISSING_AGREEMENTS }).includes(
    'acuerdo',
  ),
  'missing agreements human message',
);
assert(
  mapBenefitSettlementErrorMessage({ code: 'UNKNOWN' }) === 'No se pudo completar la operación.',
  'unknown error fallback',
);

assert(
  estimatePendingAllocationBaseCents('100000', 10, 5) === '50000',
  'proportional base estimate uses bigint strings',
);
assert(
  formatSignedBenefitMoneyCents('-500000').startsWith('−'),
  'signed money display negative',
);
assert(
  COURTESY_LEDGER_ENTRY_TYPE_LABEL.CREDIT_FROM_SETTLEMENT === 'Crédito por liquidación',
  'ledger type labels',
);

assert(
  !Object.values(BENEFIT_SETTLEMENT_STATUS_LABEL).some((l) => l.toLowerCase().includes('pagado')),
  'settlement status never says Pagado',
);

console.log('\nAll benefit settlement admin UI helper tests passed.');
