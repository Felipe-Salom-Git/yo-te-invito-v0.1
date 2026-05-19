/**
 * Safe demo database cleanup — keeps only felipe.e.salom@gmail.com and platform config.
 *
 * Usage:
 *   pnpm db:cleanup-demo              # dry-run (default)
 *   pnpm db:cleanup-demo -- --confirm
 *   pnpm db:cleanup-demo -- --confirm --include-subcategories
 *   pnpm db:cleanup-demo -- --confirm --make-preserved-user-admin
 */

import { PrismaClient, Role } from '@prisma/client';

const PRESERVED_EMAIL = 'felipe.e.salom@gmail.com';

const prisma = new PrismaClient();

type CleanupCounts = {
  events: number;
  eventMedia: number;
  ticketTypes: number;
  ticketTemplates: number;
  ticketBatches: number;
  orders: number;
  orderItems: number;
  payments: number;
  tickets: number;
  ticketTransfers: number;
  ticketScans: number;
  ticketScanLogs: number;
  reviews: number;
  courtesyGrants: number;
  referralLinks: number;
  referralAttributions: number;
  referralCommissions: number;
  eventReferrerAssignments: number;
  fraudSignals: number;
  payouts: number;
  gastroDiscounts: number;
  gastroDiscountValidations: number;
  rentalLocations: number;
  producerProfiles: number;
  gastroProfiles: number;
  hotelProfiles: number;
  referrerProfiles: number;
  producerReferrerRelationships: number;
  userProducerMemberships: number;
  userGastroMemberships: number;
  userHotelMemberships: number;
  userReferrerMemberships: number;
  inboxItems: number;
  auditLogs: number;
  roleApplications: number;
  usersToDelete: number;
  subcategoriesToDelete: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const includeSubcategories = args.includes('--include-subcategories');
  const makePreservedUserAdmin = args.includes('--make-preserved-user-admin');
  const explicitDryRun = args.includes('--dry-run');
  return {
    dryRun: explicitDryRun || !confirm,
    confirm,
    includeSubcategories,
    makePreservedUserAdmin,
  };
}

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_CLEANUP !== 'true') {
    console.error('NODE_ENV=production detected. Cleanup aborted.');
    console.error(
      'To override (not recommended): ALLOW_PRODUCTION_CLEANUP=true pnpm db:cleanup-demo -- --confirm',
    );
    process.exit(1);
  }
}

async function collectCounts(tenantId: string, preservedUserId: string): Promise<CleanupCounts> {
  const eventIds = (
    await prisma.event.findMany({ where: { tenantId }, select: { id: true } })
  ).map((e) => e.id);

  const discountIds =
    eventIds.length > 0
      ? (
          await prisma.gastroDiscount.findMany({
            where: { eventId: { in: eventIds } },
            select: { id: true },
          })
        ).map((d) => d.id)
      : [];

  const usersToDelete = await prisma.user.count({
    where: { tenantId, id: { not: preservedUserId } },
  });

  return {
    events: eventIds.length,
    eventMedia:
      eventIds.length > 0
        ? await prisma.eventMedia.count({ where: { eventId: { in: eventIds } } })
        : 0,
    ticketTypes:
      eventIds.length > 0
        ? await prisma.ticketType.count({ where: { eventId: { in: eventIds } } })
        : 0,
    ticketTemplates: await prisma.ticketTemplate.count({ where: { tenantId } }),
    ticketBatches:
      eventIds.length > 0
        ? await prisma.ticketBatch.count({ where: { eventId: { in: eventIds } } })
        : 0,
    orders:
      eventIds.length > 0
        ? await prisma.order.count({ where: { eventId: { in: eventIds } } })
        : 0,
    orderItems:
      eventIds.length > 0
        ? await prisma.orderItem.count({ where: { order: { eventId: { in: eventIds } } } })
        : 0,
    payments:
      eventIds.length > 0
        ? await prisma.payment.count({ where: { order: { eventId: { in: eventIds } } } })
        : 0,
    tickets:
      eventIds.length > 0
        ? await prisma.ticket.count({ where: { eventId: { in: eventIds } } })
        : 0,
    ticketTransfers:
      eventIds.length > 0
        ? await prisma.ticketTransfer.count({ where: { ticket: { eventId: { in: eventIds } } } })
        : 0,
    ticketScans:
      eventIds.length > 0
        ? await prisma.ticketScan.count({ where: { eventId: { in: eventIds } } })
        : 0,
    ticketScanLogs:
      eventIds.length > 0
        ? await prisma.ticketScanLog.count({ where: { eventId: { in: eventIds } } })
        : 0,
    reviews:
      eventIds.length > 0
        ? await prisma.review.count({ where: { eventId: { in: eventIds } } })
        : 0,
    courtesyGrants:
      eventIds.length > 0
        ? await prisma.courtesyGrant.count({ where: { eventId: { in: eventIds } } })
        : 0,
    referralLinks:
      eventIds.length > 0
        ? await prisma.referralLink.count({ where: { eventId: { in: eventIds } } })
        : 0,
    referralAttributions:
      eventIds.length > 0
        ? await prisma.referralAttribution.count({ where: { eventId: { in: eventIds } } })
        : 0,
    referralCommissions:
      eventIds.length > 0
        ? await prisma.referralCommission.count({ where: { eventId: { in: eventIds } } })
        : 0,
    eventReferrerAssignments:
      eventIds.length > 0
        ? await prisma.eventReferrerAssignment.count({ where: { eventId: { in: eventIds } } })
        : 0,
    fraudSignals:
      eventIds.length > 0
        ? await prisma.fraudSignal.count({ where: { eventId: { in: eventIds } } })
        : 0,
    payouts:
      eventIds.length > 0
        ? await prisma.payout.count({ where: { eventId: { in: eventIds } } })
        : 0,
    gastroDiscounts: discountIds.length,
    gastroDiscountValidations:
      discountIds.length > 0
        ? await prisma.gastroDiscountValidation.count({
            where: { discountId: { in: discountIds } },
          })
        : 0,
    rentalLocations: await prisma.rentalLocation.count({ where: { tenantId } }),
    producerProfiles: await prisma.producerProfile.count({ where: { tenantId } }),
    gastroProfiles: await prisma.gastroProfile.count({ where: { tenantId } }),
    hotelProfiles: await prisma.hotelProfile.count({ where: { tenantId } }),
    referrerProfiles: await prisma.referrerProfile.count({ where: { tenantId } }),
    producerReferrerRelationships: await prisma.producerReferrerRelationship.count({
      where: {
        OR: [
          { producerProfile: { tenantId } },
          { referrerProfile: { tenantId } },
        ],
      },
    }),
    userProducerMemberships: await prisma.userProducerMembership.count({ where: { tenantId } }),
    userGastroMemberships: await prisma.userGastroMembership.count({ where: { tenantId } }),
    userHotelMemberships: await prisma.userHotelMembership.count({ where: { tenantId } }),
    userReferrerMemberships: await prisma.userReferrerMembership.count({ where: { tenantId } }),
    inboxItems: await prisma.inboxItem.count({ where: { tenantId } }),
    auditLogs: await prisma.auditLog.count({ where: { tenantId } }),
    roleApplications: await prisma.roleApplication.count({ where: { tenantId } }),
    usersToDelete,
    subcategoriesToDelete: await prisma.contentSubcategory.count({ where: { tenantId } }),
  };
}

function printCounts(label: string, counts: CleanupCounts, includeSubcategories: boolean) {
  console.log(`\n=== ${label} ===\n`);
  console.log('Events & ticketing:');
  console.log(`  events:                    ${counts.events}`);
  console.log(`  eventMedia:                ${counts.eventMedia}`);
  console.log(`  ticketTypes:               ${counts.ticketTypes}`);
  console.log(`  ticketTemplates:           ${counts.ticketTemplates}`);
  console.log(`  ticketBatches:             ${counts.ticketBatches}`);
  console.log(`  orders:                    ${counts.orders}`);
  console.log(`  orderItems:                ${counts.orderItems}`);
  console.log(`  payments:                  ${counts.payments}`);
  console.log(`  tickets:                   ${counts.tickets}`);
  console.log(`  ticketTransfers:           ${counts.ticketTransfers}`);
  console.log(`  ticketScans:               ${counts.ticketScans}`);
  console.log(`  ticketScanLogs:            ${counts.ticketScanLogs}`);
  console.log(`  reviews:                   ${counts.reviews}`);
  console.log(`  courtesyGrants:            ${counts.courtesyGrants}`);
  console.log(`  referralLinks:             ${counts.referralLinks}`);
  console.log(`  referralAttributions:      ${counts.referralAttributions}`);
  console.log(`  referralCommissions:       ${counts.referralCommissions}`);
  console.log(`  eventReferrerAssignments:  ${counts.eventReferrerAssignments}`);
  console.log(`  fraudSignals:              ${counts.fraudSignals}`);
  console.log(`  payouts:                   ${counts.payouts}`);
  console.log('\nGastro:');
  console.log(`  gastroDiscounts:           ${counts.gastroDiscounts}`);
  console.log(`  gastroDiscountValidations: ${counts.gastroDiscountValidations}`);
  console.log('\nRentals:');
  console.log(`  rentalLocations:           ${counts.rentalLocations}`);
  console.log('\nProfiles (demo/test):');
  console.log(`  producerProfiles:          ${counts.producerProfiles}`);
  console.log(`  gastroProfiles:            ${counts.gastroProfiles}`);
  console.log(`  hotelProfiles:             ${counts.hotelProfiles}`);
  console.log(`  referrerProfiles:          ${counts.referrerProfiles}`);
  console.log(`  producerReferrerRelations: ${counts.producerReferrerRelationships}`);
  console.log(`  userProducerMemberships:   ${counts.userProducerMemberships}`);
  console.log(`  userGastroMemberships:     ${counts.userGastroMemberships}`);
  console.log(`  userHotelMemberships:      ${counts.userHotelMemberships}`);
  console.log(`  userReferrerMemberships:   ${counts.userReferrerMemberships}`);
  console.log('\nPlatform ops:');
  console.log(`  inboxItems:                ${counts.inboxItems}`);
  console.log(`  auditLogs:                 ${counts.auditLogs}`);
  console.log(`  roleApplications:          ${counts.roleApplications}`);
  console.log('\nUsers:');
  console.log(`  usersToDelete:             ${counts.usersToDelete}`);
  if (includeSubcategories) {
    console.log(`  subcategoriesToDelete:     ${counts.subcategoriesToDelete}`);
  } else {
    console.log(`  subcategoriesToDelete:     0 (preserved — use --include-subcategories to remove)`);
  }
}

function printPreserved(tenantName: string, preservedEmail: string, preservedRole: Role) {
  console.log('\n=== Preserved ===\n');
  console.log(`  tenant:                    ${tenantName}`);
  console.log(`  user:                      ${preservedEmail} (role: ${preservedRole})`);
  console.log('  PlatformConfig');
  console.log('  Tenant record');
  console.log('  ContentSubcategory definitions (unless --include-subcategories)');
}

async function deleteEventContent(tenantId: string) {
  const eventIds = (
    await prisma.event.findMany({ where: { tenantId }, select: { id: true } })
  ).map((e) => e.id);

  if (eventIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.eventReferrerAssignment.deleteMany({ where: { eventId: { in: eventIds } } });

    const discountIds = (
      await tx.gastroDiscount.findMany({
        where: { eventId: { in: eventIds } },
        select: { id: true },
      })
    ).map((d) => d.id);

    if (discountIds.length > 0) {
      await tx.gastroDiscountValidation.deleteMany({
        where: { discountId: { in: discountIds } },
      });
      await tx.gastroDiscount.deleteMany({ where: { id: { in: discountIds } } });
    }

    await tx.referralAttribution.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.referralCommission.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.payment.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
    await tx.ticketTransfer.deleteMany({
      where: { ticket: { eventId: { in: eventIds } } },
    });
    await tx.ticketScan.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.ticketScanLog.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
    await tx.order.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.ticketBatch.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.courtesyGrant.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.fraudSignal.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.payout.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.review.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.referralLink.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.eventMedia.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.ticketType.deleteMany({ where: { eventId: { in: eventIds } } });
    await tx.event.deleteMany({ where: { id: { in: eventIds } } });
  });

  await prisma.ticketTemplate.deleteMany({ where: { tenantId } });
}

async function deleteProfilesAndUsers(
  tenantId: string,
  preservedUserId: string,
  includeSubcategories: boolean,
) {
  await prisma.rentalLocation.deleteMany({ where: { tenantId } });

  await prisma.producerReferrerRelationship.deleteMany({
    where: {
      OR: [
        { producerProfile: { tenantId } },
        { referrerProfile: { tenantId } },
      ],
    },
  });

  await prisma.userProducerMembership.deleteMany({ where: { tenantId } });
  await prisma.userGastroMembership.deleteMany({ where: { tenantId } });
  await prisma.userHotelMembership.deleteMany({ where: { tenantId } });
  await prisma.userReferrerMembership.deleteMany({ where: { tenantId } });

  await prisma.producerProfile.deleteMany({ where: { tenantId } });
  await prisma.gastroProfile.deleteMany({ where: { tenantId } });
  await prisma.hotelProfile.deleteMany({ where: { tenantId } });
  await prisma.referrerProfile.deleteMany({ where: { tenantId } });

  await prisma.inboxItem.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.roleApplication.deleteMany({ where: { tenantId } });

  if (includeSubcategories) {
    await prisma.contentSubcategory.deleteMany({ where: { tenantId } });
  }

  const usersToDelete = await prisma.user.findMany({
    where: { tenantId, id: { not: preservedUserId } },
    select: { id: true },
  });
  const deleteUserIds = usersToDelete.map((u) => u.id);

  if (deleteUserIds.length > 0) {
    await prisma.$transaction([
      prisma.ticketTransfer.deleteMany({
        where: {
          OR: [
            { fromUserId: { in: deleteUserIds } },
            { toUserId: { in: deleteUserIds } },
          ],
        },
      }),
      prisma.review.deleteMany({ where: { userId: { in: deleteUserIds } } }),
      prisma.referralCommission.deleteMany({ where: { referrerId: { in: deleteUserIds } } }),
      prisma.courtesyGrant.deleteMany({ where: { createdById: { in: deleteUserIds } } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: { in: deleteUserIds } } }),
      prisma.user.deleteMany({ where: { id: { in: deleteUserIds } } }),
    ]);
  }
}

async function main() {
  assertSafeEnvironment();
  const { dryRun, confirm, includeSubcategories, makePreservedUserAdmin } = parseArgs();

  console.log('Yo Te Invito — demo database cleanup');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no changes)' : 'CONFIRM (destructive)'}`);

  const preservedUser = await prisma.user.findFirst({
    where: { email: PRESERVED_EMAIL, deletedAt: null },
  });

  if (!preservedUser) {
    console.error(`\nUser ${PRESERVED_EMAIL} was not found. Cleanup aborted.`);
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: preservedUser.tenantId } });
  if (!tenant) {
    console.error('\nTenant for preserved user was not found. Cleanup aborted.');
    process.exit(1);
  }

  const otherTenants = await prisma.tenant.count({
    where: { id: { not: tenant.id }, deletedAt: null },
  });
  if (otherTenants > 0) {
    console.log(
      `\nNote: ${otherTenants} other tenant(s) exist. Cleanup runs only for tenant "${tenant.name}" (${tenant.id}).`,
    );
  }

  const counts = await collectCounts(tenant.id, preservedUser.id);
  printCounts(dryRun ? 'Would delete' : 'Deleting', counts, includeSubcategories);
  printPreserved(tenant.name, preservedUser.email, preservedUser.role);

  if (dryRun) {
    console.log('\n=== No data was deleted (dry-run) ===');
    console.log('\nTo execute cleanup, run:');
    console.log('  pnpm db:cleanup-demo -- --confirm');
    return;
  }

  if (!confirm) {
    console.log('\nPass --confirm to delete data.');
    return;
  }

  console.log('\nExecuting cleanup…');

  await deleteEventContent(tenant.id);
  await deleteProfilesAndUsers(tenant.id, preservedUser.id, includeSubcategories);

  if (makePreservedUserAdmin && preservedUser.role !== Role.ADMIN) {
    await prisma.user.update({
      where: { id: preservedUser.id },
      data: { role: Role.ADMIN },
    });
    console.log(`\nUpdated ${PRESERVED_EMAIL} role to ADMIN.`);
  }

  const afterCounts = await collectCounts(tenant.id, preservedUser.id);
  const remainingUsers = await prisma.user.count({ where: { tenantId: tenant.id } });

  console.log('\n=== Cleanup complete ===\n');
  console.log(`  remaining users:  ${remainingUsers}`);
  console.log(`  remaining events: ${afterCounts.events}`);
  console.log(`  remaining rentals: ${afterCounts.rentalLocations}`);
  console.log(`  preserved user:   ${PRESERVED_EMAIL}`);

  if (remainingUsers !== 1) {
    console.warn(`\nWarning: expected 1 user, found ${remainingUsers}.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
