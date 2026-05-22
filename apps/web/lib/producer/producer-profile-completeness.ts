import type { ProducerDetail } from '@/repositories/interfaces';
import { parseGalleryUrls } from '@/components/producer/profile/utils';

function hasAnyContact(profile: ProducerDetail): boolean {
  return Boolean(
    profile.primaryPhone?.trim() ||
      profile.secondaryPhone?.trim() ||
      profile.whatsapp?.trim() ||
      profile.primaryEmail?.trim() ||
      profile.secondaryEmail?.trim() ||
      profile.websiteUrl?.trim() ||
      profile.instagramUrl?.trim(),
  );
}

export type ProfileBlockId = 'identity' | 'images' | 'contact' | 'public';

export type ProfileCompletenessItem = {
  id: string;
  block: ProfileBlockId;
  label: string;
  done: boolean;
  optional?: boolean;
  editHref: string;
};

export type ProfileCompletenessResult = {
  items: ProfileCompletenessItem[];
  percent: number;
  doneCount: number;
  totalRequired: number;
  blocks: Record<
    ProfileBlockId,
    { complete: boolean; label: string; editHref: string }
  >;
  checks: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasLogo: boolean;
    hasCoverOrGallery: boolean;
    hasContact: boolean;
    hasLocation: boolean;
  };
  profileStatus: string | undefined;
  isPubliclyListed: boolean;
};

const BLOCK_META: Record<
  Exclude<ProfileBlockId, 'public'>,
  { label: string; editHref: string }
> = {
  identity: { label: 'Identidad', editHref: '/producer/profile/identity' },
  images: { label: 'Imágenes', editHref: '/producer/profile/images' },
  contact: { label: 'Contacto', editHref: '/producer/profile/contact' },
};

export function getProducerProfileCompleteness(
  profile: ProducerDetail,
): ProfileCompletenessResult {
  const hasTitle = Boolean(profile.displayName?.trim());
  const hasDescription = Boolean(
    profile.shortDescription?.trim() || profile.longDescription?.trim(),
  );
  const hasLogo = Boolean(profile.logoUrl?.trim());
  const gallery = parseGalleryUrls(profile);
  const cover = profile.coverImageUrl?.trim() ?? '';
  const hasCoverOrGallery = Boolean(cover) || gallery.length > 0;
  const hasContact = hasAnyContact(profile);
  const hasLocation = Boolean(profile.city?.trim() || profile.country?.trim());

  const items: ProfileCompletenessItem[] = [
    {
      id: 'title',
      block: 'identity',
      label: 'Nombre de la productora',
      done: hasTitle,
      editHref: BLOCK_META.identity.editHref,
    },
    {
      id: 'desc',
      block: 'identity',
      label: 'Subtítulo o descripción',
      done: hasDescription,
      editHref: BLOCK_META.identity.editHref,
    },
    {
      id: 'logo',
      block: 'images',
      label: 'Logo o imagen de marca',
      done: hasLogo,
      editHref: BLOCK_META.images.editHref,
    },
    {
      id: 'gallery',
      block: 'images',
      label: 'Cabecera o galería de fotos',
      done: hasCoverOrGallery,
      editHref: BLOCK_META.images.editHref,
    },
    {
      id: 'contact',
      block: 'contact',
      label: 'Teléfono, email o WhatsApp',
      done: hasContact,
      editHref: BLOCK_META.contact.editHref,
    },
    {
      id: 'location',
      block: 'contact',
      label: 'Ciudad o país',
      done: hasLocation,
      optional: true,
      editHref: BLOCK_META.contact.editHref,
    },
  ];

  const required = items.filter((i) => !i.optional);
  const doneCount = required.filter((i) => i.done).length;
  const totalRequired = required.length;
  const percent = totalRequired
    ? Math.round((doneCount / totalRequired) * 100)
    : 0;

  const identityComplete = hasTitle && hasDescription;
  const imagesComplete = hasLogo || hasCoverOrGallery;
  const contactComplete = hasContact;

  const status = (profile.status ?? 'ACTIVE').toUpperCase();
  const isPubliclyListed = status === 'ACTIVE';

  return {
    items,
    percent,
    doneCount,
    totalRequired,
    blocks: {
      identity: {
        complete: identityComplete,
        ...BLOCK_META.identity,
      },
      images: {
        complete: imagesComplete,
        ...BLOCK_META.images,
      },
      contact: {
        complete: contactComplete,
        ...BLOCK_META.contact,
      },
      public: {
        complete: isPubliclyListed && percent >= 80,
        label: 'Vista pública',
        editHref: '/producer/profile',
      },
    },
    checks: {
      hasTitle,
      hasDescription,
      hasLogo,
      hasCoverOrGallery,
      hasContact,
      hasLocation,
    },
    profileStatus: profile.status,
    isPubliclyListed,
  };
}

export function profileStatusLabel(status?: string): string {
  const s = (status ?? 'ACTIVE').toUpperCase();
  if (s === 'DRAFT') return 'Borrador';
  if (s === 'ACTIVE') return 'Activo';
  if (s === 'PAUSED') return 'Pausado';
  return status ?? '—';
}

export function getCompletenessSummaryMessages(
  result: ProfileCompletenessResult,
): string[] {
  const msgs: string[] = [];
  if (result.percent >= 100) {
    msgs.push('Perfil básico completo.');
    return msgs;
  }
  if (!result.checks.hasTitle) msgs.push('Falta el nombre de la productora.');
  if (!result.checks.hasDescription) msgs.push('Falta subtítulo o descripción.');
  if (!result.checks.hasLogo && !result.checks.hasCoverOrGallery) {
    msgs.push('Faltan imágenes (logo, cabecera o galería).');
  } else if (!result.checks.hasLogo) {
    msgs.push('Recomendado: agregá un logo.');
  }
  if (!result.checks.hasContact) msgs.push('Falta contacto público.');
  if (!result.isPubliclyListed) {
    msgs.push(
      'El perfil no está activo: puede no aparecer en listados públicos del tenant.',
    );
  }
  return msgs;
}
