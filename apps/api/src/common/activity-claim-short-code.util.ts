import { randomInt } from 'crypto';
import { generateGastroClaimShortCode } from './gastro-claim-short-code.util';

type ShortCodeLookup = {
  activityCouponClaim: {
    findUnique(args: {
      where: { shortCode: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

/** Same 6-char charset as Gastro; uniqueness is per ActivityCouponClaim table, not cross-vertical. */
export function generateActivityCouponClaimShortCode(): string {
  return generateGastroClaimShortCode();
}

export async function allocateActivityCouponClaimShortCode(db: ShortCodeLookup): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateActivityCouponClaimShortCode();
    const existing = await db.activityCouponClaim.findUnique({
      where: { shortCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to allocate unique activity coupon claim short code');
}
