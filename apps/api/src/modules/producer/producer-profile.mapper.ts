import type { ProducerProfile } from '@prisma/client';

function galleryFromJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/** Shape esperado por el portal web (ProducerDetail). */
export function mapProducerProfileToPortal(profile: ProducerProfile) {
  const links = (profile.socialLinks as Record<string, string> | null) ?? {};
  return {
    id: profile.id,
    tenantId: profile.tenantId,
    slug: profile.slug,
    displayName: profile.displayName,
    shortDescription: profile.shortDescription,
    longDescription: profile.longDescription,
    legalName: profile.legalName,
    logoUrl: profile.logoUrl,
    coverImageUrl: profile.coverImageUrl,
    galleryUrls: galleryFromJson(profile.galleryUrls),
    primaryPhone: profile.primaryPhone,
    secondaryPhone: profile.secondaryPhone,
    primaryEmail: profile.primaryEmail,
    secondaryEmail: profile.secondaryEmail,
    whatsapp: profile.whatsapp,
    city: profile.city,
    country: profile.country,
    socialLinks: Object.keys(links).length ? links : null,
    websiteUrl: links.website ?? null,
    instagramUrl: links.instagram ?? null,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    status: profile.status,
    events: [],
  };
}
