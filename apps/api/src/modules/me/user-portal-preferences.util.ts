import type { Prisma } from '@prisma/client';
import type {
  UserPortalPreferences,
  UserPortalPreferencesPatch,
} from '@yo-te-invito/shared';
import { contentMainCategorySchema } from '@yo-te-invito/shared';

const MAX_SUBCATEGORY_IDS = 200;

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

  return {
    userId,
    preferredCity:
      typeof prev.preferredCity === 'string' ? prev.preferredCity : null,
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
    ticketReminderOverrides,
  };
}

export function mergePortalPreferencesPatch(
  prev: Prisma.JsonValue | null,
  patch: UserPortalPreferencesPatch,
): Prisma.InputJsonValue {
  const base = readPortalPreferences('', prev);
  const next = {
    preferredCity:
      patch.preferredCity !== undefined ? patch.preferredCity : base.preferredCity,
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
    ticketReminderOverrides:
      patch.ticketReminderOverrides !== undefined
        ? { ...base.ticketReminderOverrides, ...patch.ticketReminderOverrides }
        : base.ticketReminderOverrides,
  };
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
