import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  GASTRO_DISCOUNT_AGREEMENT_REQUIRED_MESSAGE,
  isGastroCourtesyFundedByCredit,
  type BenefitCommercialAgreementDto,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitCommercialAgreementsService } from './benefit-commercial-agreements.service';

export type DiscountAgreementGate = {
  /** false = funded courtesy (D1 / D-G10-3): not billable, no agreement lookup. */
  billable: boolean;
  /** CURRENT agreement of THIS discount (DISCOUNT scope), or null. */
  agreement: BenefitCommercialAgreementDto | null;
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
}
