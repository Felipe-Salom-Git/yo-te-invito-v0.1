import type { MeDashboardResponse, UserPortalPreferences } from '@yo-te-invito/shared';
import {
  buildOnboardingChecklistResult,
  type OnboardingChecklistItem,
} from './onboarding-checklist.types';

function hasNotificationPrefsConfigured(prefs: UserPortalPreferences): boolean {
  return (
    prefs.webNotificationsEnabled ||
    prefs.emailNotificationsEnabled ||
    prefs.pushAlertsEnabled ||
    prefs.notifyUpcomingEvents ||
    prefs.notifyFavoriteCategories ||
    prefs.notifyFollowedProducers
  );
}

export function getUserPortalOnboarding(
  dashboard: MeDashboardResponse | undefined,
  preferences: UserPortalPreferences | null | undefined,
): ReturnType<typeof buildOnboardingChecklistResult> {
  const stats = dashboard?.stats;
  const prefs = preferences;

  const hasCity = Boolean(
    prefs?.preferredCity?.trim() ||
      (prefs?.preferredCities?.length ?? 0) > 0,
  );
  const hasInterests = Boolean(
    (prefs?.favoriteCategories?.length ?? 0) > 0 ||
      (prefs?.favoriteSubcategoryIds?.length ?? 0) > 0,
  );
  const hasFollowing = (stats?.followedProducersCount ?? 0) > 0;
  const hasNotifications = prefs ? hasNotificationPrefsConfigured(prefs) : false;

  const items: OnboardingChecklistItem[] = [
    { id: 'account', label: 'Cuenta creada', done: true },
    {
      id: 'city',
      label: 'Ciudad preferida configurada',
      done: hasCity,
      href: '/me/account',
    },
    {
      id: 'interests',
      label: 'Preferencias de categorías',
      done: hasInterests,
      href: '/me/preferences?tab=interests',
    },
    {
      id: 'following',
      label: 'Productoras o locales seguidos',
      done: hasFollowing,
      href: '/me/preferences?tab=producers',
    },
    {
      id: 'notifications',
      label: 'Notificaciones configuradas',
      done: hasNotifications,
      href: '/me/preferences?tab=settings',
    },
  ];

  return buildOnboardingChecklistResult(items, {
    subtitle:
      'Personalizá tu experiencia para descubrir eventos y recibir alertas relevantes. No es obligatorio para usar el portal.',
    primaryCtaHref: '/me/preferences',
    primaryCtaLabel: 'Completar preferencias',
  });
}
