import type { NotificationKind } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type {
  UserPortalPreferences,
  UserPortalPreferencesPatch,
} from '@yo-te-invito/shared';
import { contentMainCategorySchema } from '@yo-te-invito/shared';

const MAX_SUBCATEGORY_IDS = 200;
const MAX_PREFERRED_CITIES = 6;

function readPreferredCitiesRaw(prev: Record<string, unknown>): string[] {
  const cities: string[] = [];
  if (Array.isArray(prev.preferredCities)) {
    for (const c of prev.preferredCities) {
      if (typeof c === 'string' && c.trim()) {
        const t = c.trim();
        if (!cities.includes(t)) {
          cities.push(t);
          if (cities.length >= MAX_PREFERRED_CITIES) break;
        }
      }
    }
  }
  if (cities.length === 0 && typeof prev.preferredCity === 'string' && prev.preferredCity.trim()) {
    cities.push(prev.preferredCity.trim());
  }
  return cities;
}

export function readPortalPreferences(
  userId: string,
  raw: Prisma.JsonValue | null,
): UserPortalPreferences {
  const prev = (raw as Record<string, unknown> | null) ?? {};
  const notifyNew =
    typeof prev.notifyNewEvents === 'boolean' ? prev.notifyNewEvents : true;
  const notifyReminders =
    typeof prev.notifyReminders === 'boolean' ? prev.notifyReminders : true;

  const favoriteCategories: UserPortalPreferences['favoriteCategories'] = [];
  if (Array.isArray(prev.favoriteCategories)) {
    for (const c of prev.favoriteCategories) {
      const parsed = contentMainCategorySchema.safeParse(c);
      if (parsed.success) favoriteCategories.push(parsed.data);
    }
  }

  const favoriteSubcategoryIds: string[] = [];
  if (Array.isArray(prev.favoriteSubcategoryIds)) {
    for (const id of prev.favoriteSubcategoryIds) {
      if (typeof id === 'string' && id.trim()) {
        favoriteSubcategoryIds.push(id);
        if (favoriteSubcategoryIds.length >= MAX_SUBCATEGORY_IDS) break;
      }
    }
  }

  const ticketReminderOverrides: Record<string, boolean> = {};
  if (
    prev.ticketReminderOverrides &&
    typeof prev.ticketReminderOverrides === 'object' &&
    !Array.isArray(prev.ticketReminderOverrides)
  ) {
    for (const [k, v] of Object.entries(prev.ticketReminderOverrides)) {
      if (typeof v === 'boolean') ticketReminderOverrides[k] = v;
    }
  }

  const preferredCities = readPreferredCitiesRaw(prev);
  const preferredCity = preferredCities[0] ?? null;

  return {
    userId,
    preferredCity,
    preferredCities,
    favoriteCategories,
    favoriteSubcategoryIds,
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
    pushAlertsEnabled:
      typeof prev.pushAlertsEnabled === 'boolean' ? prev.pushAlertsEnabled : true,
    notifyUpcomingEvents:
      typeof prev.notifyUpcomingEvents === 'boolean'
        ? prev.notifyUpcomingEvents
        : typeof prev.ticketReminder24hEnabled === 'boolean'
          ? prev.ticketReminder24hEnabled
          : notifyReminders,
    notifyTransferOffers:
      typeof prev.notifyTransferOffers === 'boolean' ? prev.notifyTransferOffers : true,
    notifyPendingReviews:
      typeof prev.notifyPendingReviews === 'boolean' ? prev.notifyPendingReviews : true,
    notifyFollowedProducers:
      typeof prev.notifyFollowedProducers === 'boolean' ? prev.notifyFollowedProducers : true,
    notifyFavoriteCategories:
      typeof prev.notifyFavoriteCategories === 'boolean'
        ? prev.notifyFavoriteCategories
        : typeof prev.favoriteEntityNotificationsEnabled === 'boolean'
          ? prev.favoriteEntityNotificationsEnabled
          : true,
    notifyFavoriteSubcategories:
      typeof prev.notifyFavoriteSubcategories === 'boolean'
        ? prev.notifyFavoriteSubcategories
        : true,
    notifyRecommendations:
      typeof prev.notifyRecommendations === 'boolean' ? prev.notifyRecommendations : false,
    notifyUnreadNotifications:
      typeof prev.notifyUnreadNotifications === 'boolean'
        ? prev.notifyUnreadNotifications
        : true,
    ticketReminderOverrides,
  };
}

export function shouldSendPushForKind(
  prefs: UserPortalPreferences,
  kind: NotificationKind,
): boolean {
  if (!prefs.pushAlertsEnabled) return false;
  switch (kind) {
    case 'TICKET_REMINDER_24H':
      return prefs.notifyUpcomingEvents;
    case 'FAVORITE_EVENT_SOON':
      return prefs.notifyFavoriteCategories;
    case 'EXPECTED_EVENT_SOON':
      return prefs.expectedEventNotificationsEnabled;
    case 'TRANSFER_OFFER_PENDING':
      return prefs.notifyTransferOffers;
    case 'REVIEW_PENDING':
      return prefs.notifyPendingReviews;
    case 'FOLLOWED_PRODUCER_NEW_EVENT':
      return prefs.notifyFollowedProducers;
    case 'FAVORITE_INTEREST_NEW_CONTENT':
      return prefs.notifyRecommendations || prefs.notifyFavoriteCategories || prefs.notifyFavoriteSubcategories;
    default:
      return prefs.notifyUnreadNotifications;
  }
}

export function pushTypeForKind(kind: NotificationKind): string {
  switch (kind) {
    case 'TICKET_REMINDER_24H':
      return 'UPCOMING_EVENT';
    case 'FAVORITE_EVENT_SOON':
      return 'FAVORITE_CATEGORY';
    case 'EXPECTED_EVENT_SOON':
      return 'EXPECTED_EVENT';
    case 'TRANSFER_OFFER_PENDING':
      return 'TRANSFER_OFFER';
    case 'REVIEW_PENDING':
      return 'REVIEW_PENDING';
    case 'FOLLOWED_PRODUCER_NEW_EVENT':
      return 'FOLLOWED_PRODUCER';
    case 'FAVORITE_INTEREST_NEW_CONTENT':
      return 'FAVORITE_INTEREST';
    default:
      return 'PORTAL_ALERT';
  }
}

export function mergePortalPreferencesPatch(
  prev: Prisma.JsonValue | null,
  patch: UserPortalPreferencesPatch,
): Prisma.InputJsonValue {
  const prevRaw = (prev as Record<string, unknown> | null) ?? {};
  const base = readPortalPreferences('', prev);
  const preferredCities =
    patch.preferredCities !== undefined
      ? patch.preferredCities
      : patch.preferredCity !== undefined
        ? patch.preferredCity
          ? [patch.preferredCity]
          : []
        : base.preferredCities;
  const preferredCity = preferredCities[0] ?? null;
  const next: Record<string, unknown> = {
    ...prevRaw,
    preferredCity,
    preferredCities,
    favoriteCategories:
      patch.favoriteCategories !== undefined
        ? patch.favoriteCategories
        : base.favoriteCategories,
    favoriteSubcategoryIds:
      patch.favoriteSubcategoryIds !== undefined
        ? patch.favoriteSubcategoryIds
        : base.favoriteSubcategoryIds,
    webNotificationsEnabled:
      patch.webNotificationsEnabled !== undefined
        ? patch.webNotificationsEnabled
        : base.webNotificationsEnabled,
    emailNotificationsEnabled:
      patch.emailNotificationsEnabled !== undefined
        ? patch.emailNotificationsEnabled
        : base.emailNotificationsEnabled,
    ticketReminder24hEnabled:
      patch.ticketReminder24hEnabled !== undefined
        ? patch.ticketReminder24hEnabled
        : base.ticketReminder24hEnabled,
    favoriteEntityNotificationsEnabled:
      patch.favoriteEntityNotificationsEnabled !== undefined
        ? patch.favoriteEntityNotificationsEnabled
        : base.favoriteEntityNotificationsEnabled,
    expectedEventNotificationsEnabled:
      patch.expectedEventNotificationsEnabled !== undefined
        ? patch.expectedEventNotificationsEnabled
        : base.expectedEventNotificationsEnabled,
    pushAlertsEnabled:
      patch.pushAlertsEnabled !== undefined ? patch.pushAlertsEnabled : base.pushAlertsEnabled,
    notifyUpcomingEvents:
      patch.notifyUpcomingEvents !== undefined
        ? patch.notifyUpcomingEvents
        : base.notifyUpcomingEvents,
    notifyTransferOffers:
      patch.notifyTransferOffers !== undefined
        ? patch.notifyTransferOffers
        : base.notifyTransferOffers,
    notifyPendingReviews:
      patch.notifyPendingReviews !== undefined
        ? patch.notifyPendingReviews
        : base.notifyPendingReviews,
    notifyFollowedProducers:
      patch.notifyFollowedProducers !== undefined
        ? patch.notifyFollowedProducers
        : base.notifyFollowedProducers,
    notifyFavoriteCategories:
      patch.notifyFavoriteCategories !== undefined
        ? patch.notifyFavoriteCategories
        : base.notifyFavoriteCategories,
    notifyFavoriteSubcategories:
      patch.notifyFavoriteSubcategories !== undefined
        ? patch.notifyFavoriteSubcategories
        : base.notifyFavoriteSubcategories,
    notifyRecommendations:
      patch.notifyRecommendations !== undefined
        ? patch.notifyRecommendations
        : base.notifyRecommendations,
    notifyUnreadNotifications:
      patch.notifyUnreadNotifications !== undefined
        ? patch.notifyUnreadNotifications
        : base.notifyUnreadNotifications,
    ticketReminderOverrides:
      patch.ticketReminderOverrides !== undefined
        ? { ...base.ticketReminderOverrides, ...patch.ticketReminderOverrides }
        : base.ticketReminderOverrides,
  };
  if (patch.preferredCities !== undefined || patch.preferredCity !== undefined) {
    next.city = preferredCity;
  }
  if (patch.notifyUpcomingEvents !== undefined) {
    next.ticketReminder24hEnabled = patch.notifyUpcomingEvents;
  }
  if (patch.ticketReminder24hEnabled !== undefined) {
    next.notifyUpcomingEvents = patch.ticketReminder24hEnabled;
  }
  return next as Prisma.InputJsonValue;
}

export function isTicketReminderEnabled(
  prefs: UserPortalPreferences,
  ticketId: string,
): boolean {
  if (!prefs.ticketReminder24hEnabled) return false;
  const override = prefs.ticketReminderOverrides[ticketId];
  if (override === false) return false;
  return true;
}
