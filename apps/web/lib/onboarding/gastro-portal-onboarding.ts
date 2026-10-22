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
  const hasLocal = Boolean(profile.id);
  const localHref = hasLocal
    ? `/gastro/local/editar?profileId=${encodeURIComponent(profile.id!)}`
    : '/gastro/local/nuevo';

  const items: OnboardingChecklistItem[] = [
    { id: 'account', label: 'Cuenta gastronómica', done: true },
    {
      id: 'basics',
      label: 'Datos básicos del local',
      done: Boolean(profile.displayName?.trim()),
      href: localHref,
    },
    {
      id: 'location-contact',
      label: 'Dirección y contacto',
      done: hasLocationAndContact(local),
      href: localHref,
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
    subtitle: hasLocal
      ? 'Completá la ficha del local, contenido y promociones desde este portal.'
      : 'Tu cuenta ya está lista. Creá tu primer local para publicar ficha, contenido y descuentos.',
    primaryCtaHref: hasLocal ? '/gastro/contenido' : '/gastro/local/nuevo',
    primaryCtaLabel: hasLocal ? 'Completar perfil gastronómico' : 'Crear mi primer local',
  });
}
