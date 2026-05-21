/**
 * Removes artifacts left by API smokes: @smoke.yo-te-invito.test users, e2e-demo notifications, [smoke-test] reviews.
 */

import type { PrismaClient } from '@prisma/client';
import {
  SMOKE_NOTIFICATION_REF_PREFIX,
  SMOKE_TEST_EMAIL_DOMAIN,
  SMOKE_TEST_MARKER,
  isSmokeTestEmail,
} from './smoke-constants';

export type SmokeCleanupCounts = {
  smokeUsers: number;
  notifications: number;
  notificationLogs: number;
  reviews: number;
  reviewDisputes: number;
  commercialReviews: number;
};

const trackedSmokeUserIds = new Set<string>();

export function trackSmokeUserId(userId: string): void {
  trackedSmokeUserIds.add(userId);
}

export function getTrackedSmokeUserIds(): string[] {
  return [...trackedSmokeUserIds];
}

function reviewSmokeWhere() {
  return {
    OR: [
      { comment: { contains: SMOKE_TEST_MARKER, mode: 'insensitive' as const } },
      { officialReply: { contains: SMOKE_TEST_MARKER, mode: 'insensitive' as const } },
      { comment: { contains: 'Smoke test Reviews V2', mode: 'insensitive' as const } },
      { comment: { contains: 'Respuesta smoke test', mode: 'insensitive' as const } },
      { comment: { contains: 'Respuesta smoke plataforma', mode: 'insensitive' as const } },
      { officialReply: { contains: 'Respuesta smoke test', mode: 'insensitive' as const } },
      { officialReply: { contains: 'Respuesta smoke plataforma', mode: 'insensitive' as const } },
    ],
  };
}

function commercialReviewSmokeWhere() {
  return {
    OR: [
      { comment: { contains: SMOKE_TEST_MARKER, mode: 'insensitive' as const } },
      { comment: { contains: 'Smoke B2B', mode: 'insensitive' as const } },
    ],
  };
}

async function deleteUserAndOwnedData(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  userId: string,
): Promise<void> {
  await tx.ticket.updateMany({
    where: {
      OR: [
        { ownerUserId: userId },
        { activeTransferOffer: { sellerUserId: userId } },
        { activeTransferOffer: { buyerUserId: userId } },
      ],
    },
    data: { activeTransferOfferId: null },
  });

  await tx.ticketTransfer.deleteMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
  });

  await tx.ticketTransferOffer.deleteMany({
    where: { OR: [{ sellerUserId: userId }, { buyerUserId: userId }] },
  });

  const ownedTicketIds = (
    await tx.ticket.findMany({ where: { ownerUserId: userId }, select: { id: true } })
  ).map((t) => t.id);

  if (ownedTicketIds.length > 0) {
    await tx.ticketScan.deleteMany({ where: { ticketId: { in: ownedTicketIds } } });
    await tx.ticketScanLog.deleteMany({ where: { ticketId: { in: ownedTicketIds } } });
    await tx.ticket.deleteMany({ where: { id: { in: ownedTicketIds } } });
  }

  const orderIds = (
    await tx.order.findMany({ where: { buyerUserId: userId }, select: { id: true } })
  ).map((o) => o.id);

  if (orderIds.length > 0) {
    const orderTicketIds = (
      await tx.ticket.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } })
    ).map((t) => t.id);

    if (orderTicketIds.length > 0) {
      await tx.ticket.updateMany({
        where: { id: { in: orderTicketIds } },
        data: { activeTransferOfferId: null },
      });
      await tx.ticketTransfer.deleteMany({ where: { ticketId: { in: orderTicketIds } } });
      await tx.ticketTransferOffer.deleteMany({
        where: { OR: [{ sourceTicketId: { in: orderTicketIds } }, { destinationTicketId: { in: orderTicketIds } }] },
      });
      await tx.ticketScan.deleteMany({ where: { ticketId: { in: orderTicketIds } } });
      await tx.ticketScanLog.deleteMany({ where: { ticketId: { in: orderTicketIds } } });
      await tx.ticket.deleteMany({ where: { id: { in: orderTicketIds } } });
    }

    await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await tx.commercialRelationshipReview.deleteMany({ where: { reviewerUserId: userId } });
  await tx.reviewDisputeRequest.deleteMany({ where: { requestedByUserId: userId } });
  await tx.review.deleteMany({ where: { userId } });

  await tx.userProducerMembership.deleteMany({ where: { userId } });
  await tx.userGastroMembership.deleteMany({ where: { userId } });
  await tx.userHotelMembership.deleteMany({ where: { userId } });
  await tx.userReferrerMembership.deleteMany({ where: { userId } });
  await tx.userProducerFollow.deleteMany({ where: { userId } });
  await tx.userFavorite.deleteMany({ where: { userId } });
  await tx.userExpectedEvent.deleteMany({ where: { userId } });
  await tx.userCartItem.deleteMany({ where: { cart: { userId } } });
  await tx.userCart.deleteMany({ where: { userId } });
  await tx.notificationDeliveryLog.deleteMany({ where: { userId } });
  await tx.userNotification.deleteMany({ where: { userId } });
  await tx.emailVerificationToken.deleteMany({ where: { userId } });
  await tx.gastroDiscountClaim.deleteMany({ where: { userId } });
  await tx.courtesyGrant.deleteMany({ where: { createdById: userId } });

  await tx.user.delete({ where: { id: userId } });
}

export async function countSmokeArtifacts(
  prisma: PrismaClient,
  tenantId?: string,
): Promise<SmokeCleanupCounts> {
  const tenantFilter = tenantId ? { tenantId } : {};

  const smokeUsers = await prisma.user.count({
    where: {
      ...tenantFilter,
      deletedAt: null,
      email: { endsWith: `@${SMOKE_TEST_EMAIL_DOMAIN}` },
    },
  });

  const notifications = await prisma.userNotification.count({
    where: {
      ...tenantFilter,
      referenceKey: { startsWith: SMOKE_NOTIFICATION_REF_PREFIX },
    },
  });

  const notificationLogs = await prisma.notificationDeliveryLog.count({
    where: {
      ...tenantFilter,
      referenceKey: { startsWith: SMOKE_NOTIFICATION_REF_PREFIX },
    },
  });

  const reviews = await prisma.review.count({
    where: { ...tenantFilter, ...reviewSmokeWhere() },
  });

  const reviewIds = (
    await prisma.review.findMany({
      where: { ...tenantFilter, ...reviewSmokeWhere() },
      select: { id: true },
    })
  ).map((r) => r.id);

  const reviewDisputes =
    reviewIds.length > 0
      ? await prisma.reviewDisputeRequest.count({ where: { reviewId: { in: reviewIds } } })
      : 0;

  const commercialReviews = await prisma.commercialRelationshipReview.count({
    where: { ...tenantFilter, ...commercialReviewSmokeWhere() },
  });

  return {
    smokeUsers,
    notifications,
    notificationLogs,
    reviews,
    reviewDisputes,
    commercialReviews,
  };
}

export async function cleanupSmokeArtifacts(
  prisma: PrismaClient,
  options: { dryRun?: boolean; tenantId?: string } = {},
): Promise<SmokeCleanupCounts> {
  const dryRun = options.dryRun ?? false;
  const tenantId = options.tenantId ?? process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
  const counts = await countSmokeArtifacts(prisma, tenantId);

  if (dryRun) return counts;

  const smokeUsers = await prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      email: { endsWith: `@${SMOKE_TEST_EMAIL_DOMAIN}` },
    },
    select: { id: true, email: true },
  });

  const trackedIds = getTrackedSmokeUserIds();
  const extraTracked = await prisma.user.findMany({
    where: {
      id: { in: trackedIds.filter((id) => !smokeUsers.some((u) => u.id === id)) },
      deletedAt: null,
    },
    select: { id: true, email: true },
  });

  const toDelete = [...smokeUsers, ...extraTracked.filter((u) => isSmokeTestEmail(u.email))];

  await prisma.$transaction(async (tx) => {
    const reviewIds = (
      await tx.review.findMany({
        where: { tenantId, ...reviewSmokeWhere() },
        select: { id: true },
      })
    ).map((r) => r.id);

    if (reviewIds.length > 0) {
      await tx.reviewDisputeRequest.deleteMany({ where: { reviewId: { in: reviewIds } } });
      await tx.review.deleteMany({ where: { id: { in: reviewIds } } });
    }

    await tx.commercialRelationshipReview.deleteMany({
      where: { tenantId, ...commercialReviewSmokeWhere() },
    });

    await tx.notificationDeliveryLog.deleteMany({
      where: { tenantId, referenceKey: { startsWith: SMOKE_NOTIFICATION_REF_PREFIX } },
    });
    await tx.userNotification.deleteMany({
      where: { tenantId, referenceKey: { startsWith: SMOKE_NOTIFICATION_REF_PREFIX } },
    });

    for (const user of toDelete) {
      await deleteUserAndOwnedData(tx, user.id);
    }
  });

  trackedSmokeUserIds.clear();
  return counts;
}

export function printSmokeCleanupSummary(
  counts: SmokeCleanupCounts,
  dryRun: boolean,
): void {
  const label = dryRun ? 'smoke:cleanup (dry-run)' : 'smoke:cleanup';
  console.log(`\n=== ${label} ===`);
  console.log(`  @${SMOKE_TEST_EMAIL_DOMAIN} users:     ${counts.smokeUsers}`);
  console.log(`  e2e-demo notifications:    ${counts.notifications}`);
  console.log(`  e2e-demo delivery logs:    ${counts.notificationLogs}`);
  console.log(`  smoke-marked reviews:      ${counts.reviews}`);
  console.log(`  review disputes:           ${counts.reviewDisputes}`);
  console.log(`  smoke B2B reviews:         ${counts.commercialReviews}`);
}
