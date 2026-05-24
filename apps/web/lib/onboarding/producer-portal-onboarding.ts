import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerProfileCompleteness } from '@/lib/producer/producer-profile-completeness';
import {
  buildOnboardingChecklistResult,
  type OnboardingChecklistItem,
} from './onboarding-checklist.types';

export function getProducerPortalOnboarding(input: {
  profile: ProducerDetail | null;
  eventsCount: number;
  portalLegalPending: boolean;
}) {
  const items: OnboardingChecklistItem[] = [
    { id: 'account', label: 'Cuenta de productora', done: true },
  ];

  if (!input.profile) {
    items.push({
      id: 'commercial-name',
      label: 'Nombre comercial',
      done: false,
      href: '/producer/profile/create',
    });
    items.push({
      id: 'images',
      label: 'Imágenes o logo',
      done: false,
      href: '/producer/profile/images',
    });
    items.push({
      id: 'contact',
      label: 'Contacto público',
      done: false,
      href: '/producer/profile/contact',
    });
    items.push({
      id: 'description',
      label: 'Descripción de la productora',
      done: false,
      href: '/producer/profile/identity',
    });
  } else {
    const c = getProducerProfileCompleteness(input.profile);
    items.push(
      {
        id: 'commercial-name',
        label: 'Nombre comercial',
        done: c.checks.hasTitle,
        href: '/producer/profile/identity',
      },
      {
        id: 'images',
        label: 'Imágenes o logo',
        done: c.checks.hasLogo || c.checks.hasCoverOrGallery,
        href: '/producer/profile/images',
      },
      {
        id: 'contact',
        label: 'Contacto público',
        done: c.checks.hasContact,
        href: '/producer/profile/contact',
      },
      {
        id: 'description',
        label: 'Descripción de la productora',
        done: c.checks.hasDescription,
        href: '/producer/profile/identity',
      },
    );
  }

  items.push({
    id: 'first-event',
    label: 'Primer evento creado',
    done: input.eventsCount > 0,
    href: '/producer/events/new',
  });

  items.push({
    id: 'portal-legal',
    label: 'Términos del portal',
    done: !input.portalLegalPending,
    href: '/producer/profile',
  });

  return buildOnboardingChecklistResult(items, {
    subtitle:
      'Completá tu ficha pública y publicá eventos. Podés seguir usando el panel mientras terminás estos pasos.',
    primaryCtaHref: '/producer/profile',
    primaryCtaLabel: 'Completar perfil de productora',
  });
}
