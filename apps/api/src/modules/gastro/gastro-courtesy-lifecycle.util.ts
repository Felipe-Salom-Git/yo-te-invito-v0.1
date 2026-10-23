import { COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL } from '@yo-te-invito/shared';

type ClaimClient = {
  gastroDiscountClaim: {
    updateMany(args: {
      where: {
        tenantId: string;
        discountId: string;
        type: 'COURTESY';
        status: { in: Array<'ACTIVE'> };
      };
      data: { status: 'CANCELLED' };
    }): Promise<{ count: number }>;
  };
};

/**
 * G8.2 — Cancelling a courtesy campaign makes its claims unusable.
 *
 * Scoped by tenant + discount (the discount is already scoped to a gastroProfile by the
 * caller). Only ACTIVE claims change; USED claims are redemption history and stay USED.
 * Run inside the same transaction as the discount status change.
 */
export async function cancelCourtesyClaimsForDiscount(
  client: ClaimClient,
  tenantId: string,
  discountId: string,
): Promise<number> {
  const res = await client.gastroDiscountClaim.updateMany({
    where: {
      tenantId,
      discountId,
      type: 'COURTESY',
      status: { in: [...COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL] },
    },
    data: { status: 'CANCELLED' },
  });
  return res.count;
}
