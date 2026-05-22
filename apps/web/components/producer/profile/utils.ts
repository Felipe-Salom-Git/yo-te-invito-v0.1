import type { ProducerDetail } from '@/repositories/interfaces';

export function parseGalleryUrls(profile: ProducerDetail): string[] {
  if (Array.isArray(profile.galleryUrls)) {
    return profile.galleryUrls.filter((x): x is string => typeof x === 'string');
  }
  if (Array.isArray(profile.gallery)) {
    return profile.gallery.map((g) => g.url).filter(Boolean);
  }
  return [];
}

/** Evita duplicar la cabecera dentro de la galería. */
export function normalizeGalleryForSave(coverUrl: string, gallery: string[]): string[] {
  const c = coverUrl.trim();
  return gallery.filter((u) => u.trim() && (!c || u.trim() !== c));
}

import { getProducerProfileCompleteness } from '@/lib/producer/producer-profile-completeness';

/** @deprecated Prefer getProducerProfileCompleteness — kept for minimal churn */
export function getProducerProfileCompletion(profile: ProducerDetail) {
  const r = getProducerProfileCompleteness(profile);
  return {
    checks: {
      hasTitle: r.checks.hasTitle,
      hasLogo: r.checks.hasLogo,
      hasCover: r.checks.hasCoverOrGallery,
      hasDesc: r.checks.hasDescription,
      hasContact: r.checks.hasContact,
    },
    done: r.doneCount,
    total: r.totalRequired,
    percent: r.percent,
  };
}

export function hasAnyContactPreview(profile: ProducerDetail): boolean {
  return getProducerProfileCompleteness(profile).checks.hasContact;
}
