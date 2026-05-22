import type { EventDetail } from '@/repositories/interfaces';
import type { PublicHotelLocation } from '@/repositories/interfaces';

/** Fallback cuando el evento hotel existe pero aún no hay HotelProfile.publicEventId vinculado. */
export function mapEventToPublicHotel(event: EventDetail, tenantId: string): PublicHotelLocation {
  const now = new Date().toISOString();
  const gallery =
    event.media?.filter((m) => m.type === 'IMAGE' && m.url).map((m) => m.url) ?? [];
  return {
    id: event.id,
    tenantId,
    displayName: event.title,
    legalName: null,
    description: event.description ?? null,
    logoUrl: null,
    bannerUrl: event.coverImageUrl ?? null,
    galleryUrls: gallery.length ? gallery : null,
    address: event.venueAddress ?? null,
    city: event.city ?? null,
    geoLat: event.geoLat ?? null,
    geoLng: event.geoLng ?? null,
    starCategory: null,
    contactPhone: null,
    whatsappPhone: null,
    contactEmail: null,
    websiteUrl: null,
    bookingUrl: null,
    socialLinks: null,
    amenities: null,
    status: 'ACTIVE',
    publicEventId: event.id,
    ratingAvg: event.ratingAvg ?? null,
    ratingCount: event.ratingCount ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}
