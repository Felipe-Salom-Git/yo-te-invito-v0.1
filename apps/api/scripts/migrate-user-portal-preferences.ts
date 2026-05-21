/**
 * Migrates legacy User.preferences JSON lists to UserFavorite / UserExpectedEvent.
 * Normalizes preferences shape for portal V1 (removes favoriteEventIds / expectedEventIds).
 *
 * Usage:
 *   pnpm --filter api run migrate:user-portal-preferences              # dry-run
 *   pnpm --filter api run migrate:user-portal-preferences -- --confirm
 */

import {
  PrismaClient,
  type FavoriteEntityType,
  type FavoriteProviderType,
  type Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();

type PrefsJson = Record<string, unknown>;

function normalizeIdList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== 'string' || !x.trim()) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function mapCategory(cat: string | null): string {
  const c = (cat ?? 'event').toLowerCase();
  if (['event', 'gastro', 'rental', 'excursion', 'hotel'].includes(c)) return c;
  return 'event';
}

function mapEntityType(category: string): FavoriteEntityType {
  if (category === 'gastro') return 'gastro';
  if (category === 'rental') return 'rental';
  if (category === 'excursion') return 'excursion';
  if (category === 'hotel') return 'hotel';
  return 'event';
}

async function resolveProvider(
  event: {
    id: string;
    tenantId: string;
    category: string | null;
    producerProfileId: string | null;
    rentalLocationId: string | null;
    excursionOperatorId: string | null;
  },
): Promise<{ providerType: FavoriteProviderType; providerId: string }> {
  const category = mapCategory(event.category);

  if (category === 'rental' && event.rentalLocationId) {
    return { providerType: 'rental_location', providerId: event.rentalLocationId };
  }
  if (category === 'excursion' && event.excursionOperatorId) {
    return { providerType: 'excursion_operator', providerId: event.excursionOperatorId };
  }
  if (category === 'gastro') {
    const gastro = await prisma.gastroProfile.findFirst({
      where: { publicEventId: event.id },
      select: { id: true },
    });
    if (gastro) return { providerType: 'gastro', providerId: gastro.id };
  }
  if (event.producerProfileId) {
    return { providerType: 'producer', providerId: event.producerProfileId };
  }
  return { providerType: 'platform', providerId: event.tenantId };
}

function buildPortalPrefs(prev: PrefsJson): PrefsJson {
  const notifyNew =
    typeof prev.notifyNewEvents === 'boolean' ? prev.notifyNewEvents : true;
  const notifyReminders =
    typeof prev.notifyReminders === 'boolean' ? prev.notifyReminders : true;

  return {
    preferredCity:
      typeof prev.preferredCity === 'string' ? prev.preferredCity : null,
    favoriteCategories: Array.isArray(prev.favoriteCategories)
      ? prev.favoriteCategories
      : [],
    favoriteSubcategoryIds: Array.isArray(prev.favoriteSubcategoryIds)
      ? prev.favoriteSubcategoryIds
      : [],
    webNotificationsEnabled:
      typeof prev.webNotificationsEnabled === 'boolean'
        ? prev.webNotificationsEnabled
        : notifyNew,
    emailNotificationsEnabled:
      typeof prev.emailNotificationsEnabled === 'boolean'
        ? prev.emailNotificationsEnabled
        : notifyNew,
    ticketReminder24hEnabled:
      typeof prev.ticketReminder24hEnabled === 'boolean'
        ? prev.ticketReminder24hEnabled
        : notifyReminders,
    favoriteEntityNotificationsEnabled:
      typeof prev.favoriteEntityNotificationsEnabled === 'boolean'
        ? prev.favoriteEntityNotificationsEnabled
        : true,
    expectedEventNotificationsEnabled:
      typeof prev.expectedEventNotificationsEnabled === 'boolean'
        ? prev.expectedEventNotificationsEnabled
        : true,
    ticketReminderOverrides:
      prev.ticketReminderOverrides &&
      typeof prev.ticketReminderOverrides === 'object' &&
      !Array.isArray(prev.ticketReminderOverrides)
        ? prev.ticketReminderOverrides
        : {},
  };
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, tenantId: true, email: true, preferences: true },
  });

  let favoritesCreated = 0;
  let favoritesSkipped = 0;
  let expectedCreated = 0;
  let expectedSkipped = 0;
  let prefsUpdated = 0;

  for (const user of users) {
    const prev = (user.preferences as PrefsJson | null) ?? {};
    const favoriteIds = normalizeIdList(prev.favoriteEventIds);
    const expectedIds = normalizeIdList(prev.expectedEventIds);

    for (const eventId of favoriteIds) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, tenantId: user.tenantId, deletedAt: null },
        select: {
          id: true,
          tenantId: true,
          category: true,
          producerProfileId: true,
          rentalLocationId: true,
          excursionOperatorId: true,
        },
      });
      if (!event) {
        favoritesSkipped += 1;
        continue;
      }

      const category = mapCategory(event.category);
      const entityType = mapEntityType(category);
      const provider = await resolveProvider(event);

      const existing = await prisma.userFavorite.findUnique({
        where: {
          tenantId_userId_entityType_entityId: {
            tenantId: user.tenantId,
            userId: user.id,
            entityType,
            entityId: event.id,
          },
        },
      });
      if (existing) {
        favoritesSkipped += 1;
        continue;
      }

      if (confirm) {
        await prisma.userFavorite.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            entityType,
            entityId: event.id,
            category,
            providerType: provider.providerType,
            providerId: provider.providerId,
            webNotificationsEnabled: true,
            emailNotificationsEnabled:
              typeof prev.emailNotificationsEnabled === 'boolean'
                ? prev.emailNotificationsEnabled
                : typeof prev.notifyNewEvents === 'boolean'
                  ? prev.notifyNewEvents
                  : true,
          },
        });
      }
      favoritesCreated += 1;
    }

    for (const eventId of expectedIds) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!event) {
        expectedSkipped += 1;
        continue;
      }

      const existing = await prisma.userExpectedEvent.findUnique({
        where: {
          tenantId_userId_eventId: {
            tenantId: user.tenantId,
            userId: user.id,
            eventId,
          },
        },
      });
      if (existing) {
        expectedSkipped += 1;
        continue;
      }

      if (confirm) {
        await prisma.userExpectedEvent.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            eventId,
            webNotificationsEnabled: true,
            emailNotificationsEnabled:
              typeof prev.emailNotificationsEnabled === 'boolean'
                ? prev.emailNotificationsEnabled
                : typeof prev.notifyNewEvents === 'boolean'
                  ? prev.notifyNewEvents
                  : true,
          },
        });
      }
      expectedCreated += 1;
    }

    const nextPrefs = buildPortalPrefs(prev);
    const changed =
      JSON.stringify(prev) !== JSON.stringify(nextPrefs) ||
      favoriteIds.length > 0 ||
      expectedIds.length > 0;

    if (changed) {
      prefsUpdated += 1;
      if (confirm) {
        await prisma.user.update({
          where: { id: user.id },
          data: { preferences: nextPrefs as Prisma.InputJsonValue },
        });
      }
    }
  }

  console.log(
    confirm ? '=== migrate:user-portal-preferences (APPLIED) ===' : '=== DRY RUN ===',
  );
  console.log(`Users scanned: ${users.length}`);
  console.log(`UserFavorite to create: ${favoritesCreated} (skip ${favoritesSkipped})`);
  console.log(`UserExpectedEvent to create: ${expectedCreated} (skip ${expectedSkipped})`);
  console.log(`Preferences JSON to normalize: ${prefsUpdated}`);
  if (!confirm) {
    console.log('\nRun with --confirm to apply.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
