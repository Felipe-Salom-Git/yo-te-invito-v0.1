/**
 * G8.11 — Courtesy accounting (D1): funded courtesy = operational usage, NOT billable usage.
 * Run: pnpm --filter api run test:gastro-courtesy-accounting
 *
 * 1) Canonical eligibility rule (shared, pure).
 * 2) Static guards over the settlement / ledger / scanner modules.
 * 3) Economic scenarios A–H against real PostgreSQL (NOT RUN if the DB is unreachable).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ErrorCode,
  isGastroCourtesyFundedByCredit,
  mapBenefitSettlementErrorMessage,
  resolveGastroDiscountSettlementBillability,
  resolveGastroValidationSettlementEligibility,
  type GastroSettlementValidationContext,
} from '@yo-te-invito/shared';
import { makeChecker } from './lib/courtesy-fake-db';
import { runCourtesyAccountingDbScenarios } from './lib/courtesy-accounting-db-scenarios';

const { state, check } = makeChecker();
const SCOPE = { tenantId: 't1', gastroProfileId: 'gp-a' };

function validation(over: {
  claimId?: string | null;
  tenantId?: string;
  gastroProfileId?: string | null;
  visibility?: string;
  campaign?: { id: string; debit?: { id: string; type: string } | null } | null;
}): GastroSettlementValidationContext {
  const campaign = over.campaign ?? null;
  return {
    claimId: over.claimId === undefined ? 'claim-1' : over.claimId,
    discount: {
      tenantId: over.tenantId ?? 't1',
      gastroProfileId: over.gastroProfileId === undefined ? 'gp-a' : over.gastroProfileId,
      visibility: over.visibility ?? 'PUBLIC',
      courtesyCampaign: campaign
        ? { id: campaign.id, courtesyCreditDebit: campaign.debit ?? null }
        : null,
    },
  };
}

const normal = validation({});
const nonFunded = validation({ visibility: 'COURTESY_ONLY', campaign: { id: 'camp-1' } });
const funded = validation({
  visibility: 'COURTESY_ONLY',
  campaign: { id: 'camp-2', debit: { id: 'led-1', type: 'DEBIT_COURTESY' } },
});

// ───────────── 1) Canonical rule ─────────────
{
  const r = resolveGastroValidationSettlementEligibility(normal, SCOPE);
  check(r.eligible && r.kind === 'DISCOUNT', 'normal discount validation → eligible (DISCOUNT)');
}
{
  const r = resolveGastroValidationSettlementEligibility(nonFunded, SCOPE);
  check(r.eligible && r.kind === 'COURTESY', 'non-funded courtesy → eligible (COURTESY)');
}
{
  const r = resolveGastroValidationSettlementEligibility(funded, SCOPE);
  check(!r.eligible && r.reason === 'FUNDED_COURTESY', 'funded courtesy → NOT eligible (FUNDED_COURTESY)');
}
check(
  !resolveGastroValidationSettlementEligibility(validation({ claimId: null }), SCOPE).eligible,
  'master QR validation (no claim) → not eligible',
);
check(
  resolveGastroValidationSettlementEligibility(validation({ gastroProfileId: 'gp-b' }), SCOPE).eligible ===
    false,
  'validation of another local → OUT_OF_SCOPE',
);
check(
  resolveGastroValidationSettlementEligibility(validation({ tenantId: 't2' }), SCOPE).eligible === false,
  'validation of another tenant → OUT_OF_SCOPE',
);
{
  const r = resolveGastroValidationSettlementEligibility(nonFunded, { ...SCOPE, alreadyAllocated: true });
  check(!r.eligible && r.reason === 'ALREADY_ALLOCATED', 'already allocated → not eligible');
}
check(
  !isGastroCourtesyFundedByCredit(
    validation({ campaign: { id: 'c', debit: { id: 'x', type: 'ADJUSTMENT' } } }).discount,
  ),
  'only DEBIT_COURTESY marks a campaign as funded',
);
check(
  !resolveGastroValidationSettlementEligibility(
    validation({ visibility: 'PUBLIC', campaign: { id: 'c', debit: { id: 'x', type: 'DEBIT_COURTESY' } } }),
    SCOPE,
  ).eligible,
  'funding detection does not depend on visibility (conservative)',
);
check(
  resolveGastroDiscountSettlementBillability(funded.discount) === 'FUNDED_COURTESY_NOT_BILLABLE' &&
    resolveGastroDiscountSettlementBillability(nonFunded.discount) === 'BILLABLE' &&
    resolveGastroDiscountSettlementBillability(normal.discount) === 'BILLABLE',
  'G6 billability: funded = operational only, non-funded / normal = billable',
);
// Caso H (pure): funding campaign A never changes eligibility of a validation of campaign B.
{
  const campaignA = validation({ visibility: 'COURTESY_ONLY', campaign: { id: 'A', debit: { id: 'd', type: 'DEBIT_COURTESY' } } });
  const campaignB = validation({ visibility: 'COURTESY_ONLY', campaign: { id: 'B' } });
  check(
    !resolveGastroValidationSettlementEligibility(campaignA, SCOPE).eligible &&
      resolveGastroValidationSettlementEligibility(campaignB, SCOPE).eligible,
    'funding is per campaign (A funded, B still billable)',
  );
}
check(
  mapBenefitSettlementErrorMessage({ code: ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY }).includes(
    'financiada con crédito',
  ),
  'FUNDED_COURTESY error has a human message',
);

// ───────────── 2) Static guards ─────────────
const SRC = join(__dirname, '..', 'src');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
{
  const eligibility = read('modules/benefit-settlements/benefit-settlement-eligibility.service.ts');
  check(
    eligibility.includes('resolveGastroValidationSettlementEligibility(row'),
    'discovery uses the canonical rule (backend-side exclusion)',
  );
  check(
    eligibility.includes('courtesyCreditDebit: { select: { id: true, type: true } }'),
    'discovery reads funding via validation → discount → campaign → DEBIT_COURTESY',
  );
  const settlements = read('modules/benefit-settlements/benefit-settlements.service.ts');
  check(
    settlements.includes('fundedCourtesyAllocationError(requestedFunded)') &&
      settlements.includes('assertNoFundedCourtesyValidations(\n              tx,'),
    'allocate rejects funded ids explicitly and re-checks inside the transaction',
  );
  const closeBody = settlements.slice(settlements.indexOf('async close('), settlements.indexOf('private allocationData('));
  check(!closeBody.includes('courtesyLedger'), 'close() never touches the courtesy ledger');
  const ledger = read('modules/courtesy-credit-ledger/courtesy-credit-ledger.service.ts');
  check(
    ledger.includes('await this.assertAllocationNotFundedCourtesy(tx, params.allocation);'),
    'CREDIT_FROM_SETTLEMENT creation refuses funded courtesy (also guards reconcile)',
  );
  check(
    !/courtesyCreditLedgerEntry\.(update|delete)/.test(ledger),
    'ledger stays append-only (no update/delete)',
  );
  const scanner = readFileSync(join(SRC, 'scanner', 'scanner-gastro-discount.service.ts'), 'utf8');
  check(
    !scanner.includes('courtesyCreditLedger') && !scanner.includes('CourtesyCreditLedgerService'),
    'scanner validation never debits courtesy credit',
  );
  const transfers = read('modules/benefit-settlements/benefit-settlement-transfers.service.ts');
  check(!/courtesy/i.test(transfers), 'BenefitSettlementTransfer logic has no courtesy special case');
}

// ───────────── 3) DB scenarios A–H ─────────────
runCourtesyAccountingDbScenarios(check)
  .then((db) => {
    console.log(`\nDB integration: ${db}`);
    if (state.failures > 0) {
      console.error(`\n${state.failures} G8.11 courtesy accounting check(s) FAILED`);
      process.exit(1);
    }
    console.log('\nAll G8.11 courtesy accounting checks passed.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
