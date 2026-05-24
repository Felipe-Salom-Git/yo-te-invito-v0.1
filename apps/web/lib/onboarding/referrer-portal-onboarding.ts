import type {
  ReferrerDashboardResponse,
  ReferrerProducerRelationshipRow,
} from '@/repositories/interfaces';
import {
  buildOnboardingChecklistResult,
  type OnboardingChecklistItem,
} from './onboarding-checklist.types';

export function getReferrerPortalOnboarding(input: {
  dashboard: ReferrerDashboardResponse;
  producerRelationships: ReferrerProducerRelationshipRow[];
  portalLegalPending: boolean;
}) {
  const { profile, metrics } = input.dashboard;
  const activeAssociations = input.producerRelationships.filter((r) => r.status === 'ACTIVE').length;
  const pendingAssociations = input.producerRelationships.filter((r) => r.status === 'PENDING').length;
  const hasSaleLinks = (metrics.saleLinks?.length ?? 0) > 0;
  const hasAssociationLink = Boolean(profile.associationLinkToken?.trim());
  const hasPublicProfile = Boolean(profile.publicProfilePath?.trim());

  const items: OnboardingChecklistItem[] = [
    { id: 'account', label: 'Cuenta de referido', done: true },
    {
      id: 'display-name',
      label: 'Nombre público',
      done: Boolean(profile.displayName?.trim()),
      href: '/referrer/configuracion',
    },
    {
      id: 'public-profile',
      label: 'Perfil visible para productoras',
      done: profile.publicVisibility !== false && hasPublicProfile,
      href: '/referrer/configuracion',
    },
    {
      id: 'links',
      label: 'Links de asociación o venta',
      done: hasAssociationLink || hasSaleLinks,
      href: '/referrer',
    },
    {
      id: 'associations',
      label: 'Asociaciones o propuestas',
      done: activeAssociations > 0 || pendingAssociations > 0,
      href: '/referrer',
    },
    {
      id: 'metrics',
      label: 'Métricas de referidos disponibles',
      done: true,
      href: '/referrer',
    },
    {
      id: 'portal-legal',
      label: 'Términos del portal',
      done: !input.portalLegalPending,
      href: '/referrer',
    },
  ];

  return buildOnboardingChecklistResult(items, {
    subtitle:
      'Revisá propuestas, acuerdos y comisiones generadas. Los pagos entre productoras y referidos son externos a la plataforma.',
    primaryCtaHref: '/referrer/configuracion',
    primaryCtaLabel: 'Completar perfil de referido',
  });
}
