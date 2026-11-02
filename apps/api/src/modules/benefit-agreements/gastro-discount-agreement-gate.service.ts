import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ErrorCode,
  GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE,
  GASTRO_DISCOUNT_INITIAL_AGREEMENT_NOT_CURRENT_MESSAGE,
  gastroDiscountEndOfDay,
  gastroDiscountStartOfDay,
  isGastroCourtesyFundedByCredit,
  isInitialDiscountAgreementCurrent,
  parseMoneyCentsString,
  type BenefitCommercialAgreementDto,
  type GastroDiscountAgreementTerms,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BenefitCommercialAgreementsService } from './benefit-commercial-agreements.service';
import { AGREEMENT_DISPLAY_INCLUDE } from './benefit-agreement-scope.util';
import {
  agreementAuditSnapshot,
  agreementRowToDto,
  parseAgreementDateKey,
  todayAgreementKey,
  type AgreementRow,
} from './benefit-agreement-dto.util';

export type DiscountAgreementGate = {
  /** false = funded courtesy (D1 / D-G10-3): not billable, no agreement lookup. */
  billable: boolean;
  /** CURRENT agreement of THIS discount (DISCOUNT scope), or null. */
  agreement: BenefitCommercialAgreementDto | null;
};

export type InitialDiscountAgreementInput = {
  tenantId: string;
  actorId: string;
  gastroProfileId: string;
  gastroDiscountId: string;
  terms: GastroDiscountAgreementTerms;
};

/**
 * G10.B — activation gate for Gastro discounts.
 * EN: every path that leaves a discount ACTIVE resolves `discount → CURRENT agreement of the
 *     discount`. The local's legacy profile row is never consulted; another discount's agreement
 *     never unlocks this one. Funded courtesies skip the lookup entirely.
 * ES: todo camino que deja un descuento ACTIVE resuelve `descuento → contrato CURRENT del
 *     descuento`. Nunca se consulta el contrato legacy del local ni el de otro descuento. Las
 *     cortesías financiadas no buscan contrato.
 */
@Injectable()
export class GastroDiscountAgreementGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly agreements: BenefitCommercialAgreementsService,
  ) {}

  async resolve(tenantId: string, discountId: string): Promise<DiscountAgreementGate> {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      select: {
        id: true,
        courtesyCampaign: {
          select: { id: true, courtesyCreditDebit: { select: { id: true, type: true } } },
        },
      },
    });
    if (!discount) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Discount not found' });
    }
    if (isGastroCourtesyFundedByCredit(discount)) {
      return { billable: false, agreement: null };
    }
    const { agreement } = await this.agreements.resolveApplicable(tenantId, {
      vertical: 'GASTRO',
      gastroDiscountId: discountId,
    });
    return { billable: true, agreement };
  }

  /** Billable discount without its own CURRENT agreement → 400 BENEFIT_AGREEMENT_NOT_FOUND. */
  async assertActivatable(
    tenantId: string,
    discountId: string,
    message: string = GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE,
  ): Promise<DiscountAgreementGate> {
    const gate = await this.resolve(tenantId, discountId);
    if (gate.billable && !gate.agreement) {
      throw new BadRequestException({ code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND, message });
    }
    return gate;
  }

  /** D-G10-4: the contract of a discount born ACTIVE must be CURRENT today (checked before any write). */
  assertInitialTermsCurrent(terms: GastroDiscountAgreementTerms): void {
    if (!isInitialDiscountAgreementCurrent(terms, todayAgreementKey())) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE,
        message: GASTRO_DISCOUNT_INITIAL_AGREEMENT_NOT_CURRENT_MESSAGE,
      });
    }
  }

  /**
   * D-G10-4: first contract of a discount created in the SAME transaction (no overlap possible:
   * the discount did not exist before). If anything fails afterwards, both roll back together.
   */
  async createInitialInTx(
    tx: Prisma.TransactionClient,
    input: InitialDiscountAgreementInput,
  ): Promise<AgreementRow> {
    this.assertInitialTermsCurrent(input.terms);
    const { terms } = input;
    return tx.benefitCommercialAgreement.create({
      data: {
        tenantId: input.tenantId,
        vertical: 'GASTRO',
        gastroProfileId: input.gastroProfileId,
        gastroDiscountId: input.gastroDiscountId,
        unitPriceCents: parseMoneyCentsString(terms.unitPriceCents),
        barterMultiplier: new Decimal(terms.barterMultiplier),
        currency: terms.currency,
        validFrom: gastroDiscountStartOfDay(...parseAgreementDateKey(terms.validFrom)),
        validTo: terms.validTo
          ? gastroDiscountEndOfDay(...parseAgreementDateKey(terms.validTo))
          : null,
        notes: terms.notes ?? null,
        createdByUserId: input.actorId,
      },
      include: AGREEMENT_DISPLAY_INCLUDE,
    });
  }

  /** Audit + DTO of a committed initial contract (after the transaction). */
  async recordInitial(
    tenantId: string,
    actor: { id: string; role: string },
    row: AgreementRow,
  ): Promise<BenefitCommercialAgreementDto> {
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_CREATED',
      entityType: 'BenefitCommercialAgreement',
      entityId: row.id,
      after: agreementAuditSnapshot(row),
      metadata: { createdWithDiscount: true, gastroDiscountId: row.gastroDiscountId },
    });
    return agreementRowToDto(row, todayAgreementKey());
  }
}
