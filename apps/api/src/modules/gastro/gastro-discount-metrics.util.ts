import type { PrismaClient } from '@prisma/client';
import { isCourtesyClaimRetained, isGastroDiscountExpired } from '@yo-te-invito/shared';
import type {
  GastroCourtesyCampaignMetrics,
  GastroDiscountSummaryClaim,
  GastroDiscountSummaryMetrics,
} from '@yo-te-invito/shared';

type ClaimRow = {
  id: string;
  status: string;
  type: string;
  source: string;
  email: string;
  userId: string | null;
  recipientName: string | null;
  createdAt: Date;
  usedAt: Date | null;
  expiresAt: Date | null;
  emailSentAt: Date | null;
  emailSendError: string | null;
  user?: { firstName: string; lastName: string } | null;
};

/** Fields the metric buckets read (a narrow `select` is enough). */
export type ClaimMetricsRow = Pick<
  ClaimRow,
  'status' | 'type' | 'usedAt' | 'expiresAt' | 'emailSentAt' | 'emailSendError'
> &
  Partial<Pick<ClaimRow, 'source' | 'userId'>>;

function isClaimExpired(row: ClaimMetricsRow): boolean {
  if (row.status === 'EXPIRED') return true;
  if (row.status === 'USED' || row.usedAt) return false;
  return isGastroDiscountExpired(row.expiresAt);
}

/**
 * Claim buckets (G8.8). Mutually exclusive per claim:
 *   used | cancelled | expired | retained (courtesy held until approval) | available (usable now)
 * `deliveredClaims` is a subset of `availableClaims` (courtesy, emailed, still ACTIVE).
 * A retained claim is never "available" nor "delivered": it is only frozen audience.
 */
export function computeGastroDiscountClaimMetrics(
  claims: ClaimMetricsRow[],
  opts: { parentStatus?: string | null } = {},
): GastroDiscountSummaryMetrics {
  let retainedClaims = 0;
  let deliveredClaims = 0;
  let availableClaims = 0;
  let usedClaims = 0;
  let expiredClaims = 0;
  let cancelledClaims = 0;
  let courtesyClaims = 0;
  let publicClaims = 0;
  let emailSentCount = 0;
  let emailFailedCount = 0;

  for (const claim of claims) {
    if (claim.type === 'COURTESY') courtesyClaims += 1;
    else publicClaims += 1;

    if (claim.emailSentAt) emailSentCount += 1;
    if (claim.emailSendError) emailFailedCount += 1;

    if (claim.status === 'USED' || claim.usedAt) {
      usedClaims += 1;
      continue;
    }
    if (claim.status === 'CANCELLED') {
      cancelledClaims += 1;
      continue;
    }
    if (
      isCourtesyClaimRetained({
        claimType: claim.type,
        claimStatus: claim.status,
        parentStatus: opts.parentStatus,
      })
    ) {
      retainedClaims += 1;
      continue;
    }
    if (claim.status === 'EXPIRED' || isClaimExpired(claim)) {
      expiredClaims += 1;
      continue;
    }
    if (claim.status === 'ACTIVE') {
      availableClaims += 1;
      if (claim.type === 'COURTESY' && claim.emailSentAt) deliveredClaims += 1;
    }
  }

  return {
    totalClaims: claims.length,
    availableClaims,
    retainedClaims,
    deliveredClaims,
    usedClaims,
    expiredClaims,
    cancelledClaims,
    courtesyClaims,
    publicClaims,
    emailSentCount,
    emailFailedCount,
  };
}

/**
 * G8.9 / G8.10 — Courtesy campaign metrics (owner list/detail + ADMIN list/review).
 * Reuses the exclusive G8.8 buckets; adds the frozen audience breakdown and the claims a
 * redelivery would target (approved parent, usable, never emailed). Retained claims are
 * never available / delivered / pending delivery.
 */
export function computeCourtesyCampaignMetrics(
  claims: ClaimMetricsRow[],
  parentStatus: string | null | undefined,
): GastroCourtesyCampaignMetrics {
  const courtesyClaims = claims.filter((c) => c.type === 'COURTESY');
  const buckets = computeGastroDiscountClaimMetrics(courtesyClaims, { parentStatus });
  const parentApproved = parentStatus === 'ACTIVE' || parentStatus === 'APPROVED';
  let manualRecipientCount = 0;
  let followerRecipientCount = 0;
  let registeredRecipientCount = 0;
  let pendingDeliveryClaims = 0;
  for (const claim of courtesyClaims) {
    if (claim.source === 'FOLLOWERS') followerRecipientCount += 1;
    else manualRecipientCount += 1;
    if (claim.userId) registeredRecipientCount += 1;
    if (
      parentApproved &&
      claim.status === 'ACTIVE' &&
      !claim.usedAt &&
      claim.emailSentAt == null &&
      !isClaimExpired(claim)
    ) {
      pendingDeliveryClaims += 1;
    }
  }
  return {
    recipientCount: courtesyClaims.length,
    manualRecipientCount,
    followerRecipientCount,
    registeredRecipientCount,
    retainedClaims: buckets.retainedClaims ?? 0,
    availableClaims: buckets.availableClaims,
    deliveredClaims: buckets.deliveredClaims ?? 0,
    pendingDeliveryClaims,
    usedClaims: buckets.usedClaims,
    cancelledClaims: buckets.cancelledClaims,
    expiredClaims: buckets.expiredClaims,
  };
}

/** Narrow claim `select` for courtesy metrics (no tokens, no emails). */
export const COURTESY_METRICS_CLAIM_SELECT = {
  discountId: true,
  status: true,
  type: true,
  source: true,
  userId: true,
  usedAt: true,
  expiresAt: true,
  emailSentAt: true,
  emailSendError: true,
} as const;

/**
 * Batched courtesy metrics for a list (one claims query, no N+1). Only COURTESY_ONLY rows
 * get an entry; everything is scoped by tenant + the given discount ids.
 */
export async function loadCourtesyMetricsByDiscount(
  prisma: Pick<PrismaClient, 'gastroDiscountClaim'>,
  tenantId: string,
  discounts: Array<{ id: string; status: string; visibility?: string | null }>,
): Promise<Map<string, GastroCourtesyCampaignMetrics>> {
  const courtesies = discounts.filter((d) => d.visibility === 'COURTESY_ONLY');
  const result = new Map<string, GastroCourtesyCampaignMetrics>();
  if (courtesies.length === 0) return result;
  const claims = await prisma.gastroDiscountClaim.findMany({
    where: { tenantId, discountId: { in: courtesies.map((d) => d.id) }, type: 'COURTESY' },
    select: COURTESY_METRICS_CLAIM_SELECT,
  });
  const byDiscount = new Map<string, ClaimMetricsRow[]>();
  for (const claim of claims) {
    const list = byDiscount.get(claim.discountId) ?? [];
    list.push(claim);
    byDiscount.set(claim.discountId, list);
  }
  for (const d of courtesies) {
    result.set(d.id, computeCourtesyCampaignMetrics(byDiscount.get(d.id) ?? [], d.status));
  }
  return result;
}

export function mapGastroDiscountSummaryClaim(row: ClaimRow): GastroDiscountSummaryClaim {
  return {
    id: row.id,
    status: row.status as GastroDiscountSummaryClaim['status'],
    type: row.type as GastroDiscountSummaryClaim['type'],
    source: row.source as GastroDiscountSummaryClaim['source'],
    email: row.email,
    userId: row.userId,
    userName:
      row.recipientName ??
      (row.user ? `${row.user.firstName} ${row.user.lastName}`.trim() : null),
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    emailSentAt: row.emailSentAt?.toISOString() ?? null,
    emailSendError: row.emailSendError,
  };
}
