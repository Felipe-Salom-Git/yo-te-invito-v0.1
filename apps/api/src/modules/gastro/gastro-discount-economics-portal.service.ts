import { Injectable } from '@nestjs/common';
import type { GastroDiscountEconomicSummaryGastro } from '@yo-te-invito/shared';
import { GastroDiscountEconomicSummaryService } from '../benefit-settlements/gastro-discount-economic-summary.service';
import { GastroPortalDiscountsService } from './gastro-portal-discounts.service';

/**
 * G10.C3 — read-only economic summary for the GASTRO owner of a discount.
 * EN: authority = discount → gastroProfileId → ownership (same check as every portal discount
 *     route); the response is the redacted GASTRO projection. No write methods on purpose.
 * ES: autoridad = descuento → local → membresía; respuesta redactada (sin notas, actores ni
 *     comprobantes). Sin métodos de escritura.
 */
@Injectable()
export class GastroDiscountEconomicsPortalService {
  constructor(
    private readonly portalDiscounts: GastroPortalDiscountsService,
    private readonly economicSummary: GastroDiscountEconomicSummaryService,
  ) {}

  async getSummary(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
  ): Promise<GastroDiscountEconomicSummaryGastro> {
    const { row, profile } = await this.portalDiscounts.assertOwnDiscount(
      tenantId,
      userId,
      userRole,
      discountId,
    );
    return this.economicSummary.getForGastro(tenantId, profile.id, row.id);
  }
}
