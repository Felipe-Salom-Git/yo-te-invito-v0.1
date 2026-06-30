import { isGastroDiscountExpired } from '@yo-te-invito/shared';
import type {
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

function isClaimExpired(row: ClaimRow): boolean {
  if (row.status === 'EXPIRED') return true;
  if (row.status === 'USED' || row.usedAt) return false;
  return isGastroDiscountExpired(row.expiresAt);
}

export function computeGastroDiscountClaimMetrics(
  claims: ClaimRow[],
): GastroDiscountSummaryMetrics {
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
    if (claim.status === 'EXPIRED' || isClaimExpired(claim)) {
      expiredClaims += 1;
      continue;
    }
    if (claim.status === 'ACTIVE') {
      availableClaims += 1;
    }
  }

  return {
    totalClaims: claims.length,
    availableClaims,
    usedClaims,
    expiredClaims,
    cancelledClaims,
    courtesyClaims,
    publicClaims,
    emailSentCount,
    emailFailedCount,
  };
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
