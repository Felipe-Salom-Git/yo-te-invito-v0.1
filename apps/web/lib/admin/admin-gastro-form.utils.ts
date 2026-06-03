import type {
  AdminGastroLocationCreateInput,
  AdminGastroLocationStatusInput,
  AdminGastroLocationUpdateInput,
} from '@yo-te-invito/shared';
import type {
  AdminGastroLocationDetail,
  GastroLocal,
  GastroLocalUpsertPayload,
} from '@/repositories/interfaces';

export function mapAdminGastroDetailToGastroLocal(
  detail: AdminGastroLocationDetail,
): GastroLocal {
  const statusUpper = detail.status.toUpperCase() as GastroLocal['status'];
  return {
    id: detail.id,
    tenantId: detail.tenantId,
    displayName: detail.displayName,
    legalName: detail.legalName,
    summary: detail.summary,
    detail: detail.detail,
    description: null,
    logoUrl: null,
    bannerUrl: detail.bannerUrl,
    galleryUrls: detail.galleryUrls ?? null,
    province: detail.province,
    city: detail.city,
    address: detail.address,
    googlePlaceId: detail.googlePlaceId ?? null,
    geoLat: detail.geoLat ?? null,
    geoLng: detail.geoLng ?? null,
    openingHours: detail.openingHours ?? null,
    openingHoursNote: detail.openingHoursNote ?? null,
    contactPhone: detail.contactPhone,
    contactEmail: detail.contactEmail,
    menuUrl: detail.menuUrl,
    websiteUrl: detail.websiteUrl,
    subcategoryId: detail.subcategoryId,
    publicEventId: detail.publicEventId,
    status: statusUpper,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export function gastroPayloadToAdminCreate(
  payload: GastroLocalUpsertPayload,
  extras: {
    legalName: string | null;
    ownerUserId: string | null;
    status: AdminGastroLocationStatusInput;
    publish: boolean;
  },
): AdminGastroLocationCreateInput {
  return {
    displayName: payload.displayName,
    summary: payload.summary,
    detail: payload.detail,
    subcategoryId: payload.subcategoryId,
    bannerUrl: payload.bannerUrl,
    galleryUrls: payload.galleryUrls?.length ? payload.galleryUrls : undefined,
    location: payload.location,
    openingHours: payload.openingHours,
    openingHoursNote: payload.openingHoursNote,
    contactPhone: payload.contactPhone,
    contactEmail: payload.contactEmail,
    menuUrl: payload.menuUrl,
    websiteUrl: payload.websiteUrl,
    legalName: extras.legalName,
    ...(extras.ownerUserId ? { ownerUserId: extras.ownerUserId } : {}),
    status: extras.status,
    publish: extras.publish,
  };
}

export function gastroPayloadToAdminUpdate(
  payload: GastroLocalUpsertPayload,
  extras: {
    legalName: string | null;
    ownerUserId: string | null;
  },
): AdminGastroLocationUpdateInput {
  return {
    displayName: payload.displayName,
    summary: payload.summary,
    detail: payload.detail,
    subcategoryId: payload.subcategoryId,
    bannerUrl: payload.bannerUrl,
    galleryUrls: payload.galleryUrls,
    location: payload.location,
    openingHours: payload.openingHours,
    openingHoursNote: payload.openingHoursNote,
    contactPhone: payload.contactPhone,
    contactEmail: payload.contactEmail,
    menuUrl: payload.menuUrl,
    websiteUrl: payload.websiteUrl,
    legalName: extras.legalName,
    ...(extras.ownerUserId ? { ownerUserId: extras.ownerUserId } : {}),
  };
}
