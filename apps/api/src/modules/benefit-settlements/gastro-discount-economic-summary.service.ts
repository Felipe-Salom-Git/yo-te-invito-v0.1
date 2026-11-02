import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  buildDiscountEconomicHistory,
  buildDiscountSettlementLines,
  countDiscountEconomicValidations,
  gastroDiscountEconomicSummaryAdminSchema,
  isCourtesyOnlyVisibility,
  isGastroCourtesyDiscount,
  moneyCentsToString,
  redactGastroDiscountEconomicSummaryForGastro,
  resolveGastroDiscountSettlementBillability,
  summarizeDiscountBarter,
  summarizeDiscountCash,
  type GastroDiscountEconomicSummaryAdmin,
  type GastroDiscountEconomicSummaryGastro,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitDiscountAgreementHistoryService } from '../benefit-agreements/benefit-discount-agreement-history.service';
import { CourtesyCreditLedgerService } from '../courtesy-credit-ledger/courtesy-credit-ledger.service';
import {
  ECONOMIC_SUMMARY_DISCOUNT_SELECT,
  loadActorLabels,
  loadAgreementAudits,
  loadDiscountEconomicRows,
  type EconomicSummaryDiscountRow,
} from './gastro-discount-economic-summary.loader';

/**
 * G10.C — canonical economic summary of ONE GastroDiscount (ADMIN full / GASTRO redacted).
 * EN: one service for both audiences; GASTRO gets the same figures through the redaction schema.
 *     Read-only: never writes, never prorates legacy transfers, never sums CASH + credit.
 * ES: un único servicio para ambos públicos; GASTRO recibe las mismas cifras redactadas.
 */
@Injectable()
export class GastroDiscountEconomicSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CourtesyCreditLedgerService,
    private readonly agreementHistory: BenefitDiscountAgreementHistoryService,
  ) {}

  /** ADMIN route: the discount must belong to the route profile (mismatch → 404, G8.10.11). */
  async getForAdmin(
    tenantId: string,
    profileId: string,
    discountId: string,
  ): Promise<GastroDiscountEconomicSummaryAdmin> {
    const discount = await this.loadScopedDiscount(tenantId, profileId, discountId);
    return this.build(tenantId, discount);
  }

  /**
   * GASTRO route: the caller already authorized discount → gastroProfileId → ownership;
   * the profile is re-checked here (defense in depth). Never accepts a client profileId.
   */
  async getForGastro(
    tenantId: string,
    ownedProfileId: string,
    discountId: string,
  ): Promise<GastroDiscountEconomicSummaryGastro> {
    const discount = await this.loadScopedDiscount(tenantId, ownedProfileId, discountId);
    return redactGastroDiscountEconomicSummaryForGastro(await this.build(tenantId, discount));
  }

  private async loadScopedDiscount(
    tenantId: string,
    profileId: string,
    discountId: string,
  ): Promise<EconomicSummaryDiscountRow> {
    const scopedProfileId = profileId?.trim();
    const row = scopedProfileId
      ? await this.prisma.gastroDiscount.findFirst({
          where: { id: discountId, tenantId, gastroProfileId: scopedProfileId },
          select: ECONOMIC_SUMMARY_DISCOUNT_SELECT,
        })
      : null;
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Discount not found' });
    }
    return row;
  }

  private async build(
    tenantId: string,
    discount: EconomicSummaryDiscountRow,
  ): Promise<GastroDiscountEconomicSummaryAdmin> {
    const [contract, rows] = await Promise.all([
      this.agreementHistory.discountHistory(tenantId, discount.id),
      loadDiscountEconomicRows(this.prisma, tenantId, discount.id),
    ]);
    const { validations, allocations, transfers, settlements, credits, barterIds } = rows;

    const validationCounts = countDiscountEconomicValidations({
      validations,
      allocatedValidationIds: new Set(allocations.map((a) => a.validationId)),
      billable: contract.billable,
      agreements: contract.history.map((a) => ({
        id: a.id,
        validFromKey: a.validFrom,
        validToKey: a.validTo,
      })),
    });

    const lines = buildDiscountSettlementLines({
      discountId: discount.id,
      discountAllocationIds: new Set(allocations.map((a) => a.id)),
      settlements,
    });
    const periodBySettlement = new Map(settlements.map((s) => [s.id, s.periodKey] as const));

    const [creditGenerated, audits, partnerBalance] = await Promise.all([
      this.ledger.sumMaterializedCreditForAllocations(barterIds),
      loadAgreementAudits(this.prisma, tenantId, contract.history.map((a) => a.id)),
      discount.gastroProfileId
        ? this.ledger.getPartnerBalance(tenantId, {
            vertical: 'GASTRO',
            gastroProfileId: discount.gastroProfileId,
            currency: 'ARS',
          })
        : Promise.resolve(null),
    ]);

    const actorLabels = await loadActorLabels(this.prisma, tenantId, [
      ...contract.history.map((a) => a.createdByUserId),
      ...audits.map((a) => a.actorId),
      ...allocations.map((a) => a.allocatedByUserId),
      ...credits.map((c) => c.createdByUserId),
      ...transfers.flatMap((t) => [t.registeredByUserId, t.reversedByUserId]),
    ]);
    const actor = (userId: string | null) =>
      userId ? { userId, label: actorLabels.get(userId) ?? 'Usuario no disponible' } : null;

    const history = buildDiscountEconomicHistory({
      agreements: contract.history.map((a) => ({
        id: a.id,
        createdAt: new Date(a.createdAt),
        validFrom: a.validFrom,
        createdByUserId: a.createdByUserId,
      })),
      agreementAudits: audits,
      allocations: allocations.map((a) => ({
        ...a,
        periodKey: periodBySettlement.get(a.settlementId) ?? '',
      })),
      credits: credits.flatMap((c) => (c.sourceAllocationId ? [{ ...c, sourceAllocationId: c.sourceAllocationId }] : [])),
      transfers: transfers.map((t) => ({ ...t, periodKey: periodBySettlement.get(t.settlementId) ?? '' })),
      actorLabels,
    });

    const summary: GastroDiscountEconomicSummaryAdmin = {
      audience: 'ADMIN',
      currency: contract.current?.currency ?? allocations[0]?.currency ?? 'ARS',
      discount: {
        id: discount.id,
        gastroProfileId: discount.gastroProfileId,
        title: discount.displayTitle,
        status: discount.status,
        visibility: isCourtesyOnlyVisibility(discount.visibility) ? 'COURTESY_ONLY' : 'PUBLIC',
        isCourtesy: isGastroCourtesyDiscount(discount),
        settlementBillability: resolveGastroDiscountSettlementBillability(discount),
      },
      agreement: {
        current: contract.current,
        history: contract.history,
        legacyUsed: contract.legacyUsed.map((l) => ({ ...l, precision: 'PARTNER_LEVEL_LEGACY' as const })),
      },
      validations: validationCounts,
      cash: summarizeDiscountCash({ allocations, lines }),
      barter: summarizeDiscountBarter({ allocations, ledgerCreditGeneratedCents: creditGenerated }),
      settlements: lines,
      payments: transfers.map((t) => ({
        transferId: t.id,
        settlementId: t.settlementId,
        periodKey: periodBySettlement.get(t.settlementId) ?? '',
        amountCents: moneyCentsToString(t.amountCents),
        currency: t.currency,
        transferredAt: t.transferredAt.toISOString(),
        reference: t.reference,
        isActive: t.reversedAt == null,
        reversedAt: t.reversedAt?.toISOString() ?? null,
        reversalReason: t.reversalReason,
        notes: t.notes,
        proofUrl: t.proofUrl,
        registeredBy: actor(t.registeredByUserId),
        reversedBy: actor(t.reversedByUserId),
      })),
      history,
      partnerCredit: partnerBalance
        ? {
            precision: 'PARTNER_LEVEL',
            currency: partnerBalance.currency,
            balanceAvailableCents: partnerBalance.balanceAvailableCents,
          }
        : null,
    };
    return gastroDiscountEconomicSummaryAdminSchema.parse(summary);
  }
}
