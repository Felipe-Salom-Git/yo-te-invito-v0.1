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

export function getProducerProfileCompletion(profile: ProducerDetail) {
  const hasTitle = Boolean(profile.displayName?.trim());
  const hasLogo = Boolean(profile.logoUrl?.trim());
  const hasCover = Boolean(profile.coverImageUrl?.trim());
  const hasDesc = Boolean(
    profile.longDescription?.trim() || profile.shortDescription?.trim(),
  );
  const hasContact = Boolean(
    profile.primaryPhone?.trim() ||
      profile.secondaryPhone?.trim() ||
      profile.whatsapp?.trim() ||
      profile.primaryEmail?.trim() ||
      profile.secondaryEmail?.trim() ||
      profile.websiteUrl?.trim() ||
      profile.instagramUrl?.trim(),
  );
  const checks = { hasTitle, hasLogo, hasCover, hasDesc, hasContact };
  const done = Object.values(checks).filter(Boolean).length;
  const total = 5;
  return { checks, done, total, percent: Math.round((done / total) * 100) };
}

export function hasAnyContactPreview(profile: ProducerDetail): boolean {
  return getProducerProfileCompletion(profile).checks.hasContact;
}
