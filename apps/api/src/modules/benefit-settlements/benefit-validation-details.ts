import type { PrismaService } from '../../prisma/prisma.service';

export type BenefitValidationDetail = {
  validatedAt: Date;
  benefitId: string;
  benefitTitle: string;
  shortCode: string | null;
};

/**
 * Display details for validations (title, benefit id, claim short code, real validatedAt).
 * Callers must pass ids already scoped to tenant + partner (settlement eligibility / allocations).
 */
export async function loadBenefitValidationDetails(
  prisma: PrismaService,
  items: ReadonlyArray<{ validationSource: string; validationId: string }>,
): Promise<Map<string, BenefitValidationDetail>> {
  const map = new Map<string, BenefitValidationDetail>();
  const gastroIds = items
    .filter((i) => i.validationSource === 'GASTRO_DISCOUNT_VALIDATION')
    .map((i) => i.validationId);
  const activityIds = items
    .filter((i) => i.validationSource === 'ACTIVITY_COUPON_VALIDATION')
    .map((i) => i.validationId);

  if (gastroIds.length) {
    const rows = await prisma.gastroDiscountValidation.findMany({
      where: { id: { in: gastroIds } },
      select: {
        id: true,
        validatedAt: true,
        discount: { select: { id: true, displayTitle: true, code: true } },
        claim: { select: { shortCode: true } },
      },
    });
    for (const v of rows) {
      map.set(v.id, {
        validatedAt: v.validatedAt,
        benefitId: v.discount.id,
        benefitTitle: v.discount.displayTitle ?? v.discount.code,
        shortCode: v.claim?.shortCode ?? null,
      });
    }
  }
  if (activityIds.length) {
    const rows = await prisma.activityCouponValidation.findMany({
      where: { id: { in: activityIds } },
      select: {
        id: true,
        validatedAt: true,
        coupon: { select: { id: true, title: true } },
        claim: { select: { shortCode: true } },
      },
    });
    for (const v of rows) {
      map.set(v.id, {
        validatedAt: v.validatedAt,
        benefitId: v.coupon.id,
        benefitTitle: v.coupon.title,
        shortCode: v.claim?.shortCode ?? null,
      });
    }
  }
  return map;
}
