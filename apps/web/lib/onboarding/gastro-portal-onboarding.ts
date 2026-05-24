import type { GastroDashboardResponse } from '@yo-te-invito/shared';
import type { GastroLocal } from '@/repositories/interfaces';
import {
  buildOnboardingChecklistResult,
  type OnboardingChecklistItem,
} from './onboarding-checklist.types';

function hasLocationAndContact(local: GastroLocal | null | undefined): boolean {
  if (!local) return false;
  const hasLocation = Boolean(local.address?.trim() && local.city?.trim());
  const hasContact = Boolean(local.contactPhone?.trim() || local.contactEmail?.trim());
  return hasLocation && hasContact;
}

export function getGastroPortalOnboarding(
  dashboard: GastroDashboardResponse,
  local: GastroLocal | null | undefined,
  portalLegalPending: boolean,
) {
  const { profile, kpis } = dashboard;

  const items: OnboardingChecklistItem[] = [
    { id: 'account', label: 'Cuenta gastronómica', done: true },
    {
      id: 'basics',
      label: 'Datos básicos del local',
      done: Boolean(profile.displayName?.trim()),
      href: '/gastro/local/editar',
    },
    {
      id: 'location-contact',
      label: 'Dirección y contacto',
      done: hasLocationAndContact(local),
      href: '/gastro/local/editar',
    },
    {
      id: 'content',
      label: 'Contenido publicado',
      done: profile.publishedContentCount > 0,
      href: '/gastro/contenido',
    },
    {
      id: 'discounts',
      label: 'Descuentos configurados',
      done: kpis.activeDiscounts > 0,
      href: '/gastro/descuentos',
    },
    {
      id: 'reviews',
      label: 'Ficha lista para valoraciones',
      done: Boolean(profile.publicEventId),
      href: '/gastro/valoraciones',
    },
    {
      id: 'portal-legal',
      label: 'Términos del portal',
      done: !portalLegalPending,
      href: '/gastro',
    },
  ];

  return buildOnboardingChecklistResult(items, {
    subtitle:
      'Tu registro ya creó el perfil inicial. Completá local, contenido y promociones desde este portal.',
    primaryCtaHref: '/gastro/contenido',
    primaryCtaLabel: 'Completar perfil gastronómico',
  });
}
