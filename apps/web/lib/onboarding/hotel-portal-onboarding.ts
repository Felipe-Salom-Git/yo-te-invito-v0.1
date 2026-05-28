import type { HotelProfile } from '@/repositories/interfaces';
import { getHotelProfileCompleteness } from '@/lib/hotel/hotel-profile-completeness';
import {
  buildOnboardingChecklistResult,
  type OnboardingChecklistItem,
} from './onboarding-checklist.types';

export function getHotelPortalOnboarding(
  profile: HotelProfile,
  portalLegalPending: boolean,
) {
  const completeness = getHotelProfileCompleteness(profile);

  const items: OnboardingChecklistItem[] = completeness.items.map((item) => ({
    id: item.id,
    label: item.label,
    done: item.done,
    href: item.editHref,
  }));

  items.unshift({ id: 'account', label: 'Cuenta de hotel', done: true });
  items.push({
    id: 'portal-legal',
    label: 'Términos del portal',
    done: !portalLegalPending,
    href: '/hotel/editar',
  });

  return buildOnboardingChecklistResult(items, {
    subtitle:
      'Ficha informativa y contacto. Yo Te Invito no gestiona reservas, disponibilidad ni pagos hoteleros en esta versión.',
    primaryCtaHref: '/hotel/editar',
    primaryCtaLabel: 'Completar ficha del hotel',
  });
}
