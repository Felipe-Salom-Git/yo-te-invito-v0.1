import { Prisma, type GastroProfile } from '@prisma/client';
import {
  rentalOpeningHoursSchema,
  trimToPublicSummary,
  type GastroLocalCreateInput,
} from '@yo-te-invito/shared';

export function normalizeGastroSummary(value: string | null | undefined): string | null {
  return trimToPublicSummary(value);
}

export function readGastroGallery(row: GastroProfile): string[] | null {
  if (!row.galleryUrls || !Array.isArray(row.galleryUrls)) return null;
  return (row.galleryUrls as string[]).filter((u) => typeof u === 'string');
}

export function writeGastroOpeningHours(
  value: GastroLocalCreateInput['openingHours'] | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value == null) return Prisma.JsonNull;
  return rentalOpeningHoursSchema.parse(value) as Prisma.InputJsonValue;
}

export function shouldSyncGastroPublicEventAfterUpdate(body: {
  displayName?: string;
  summary?: string | null;
  detail?: string | null;
  bannerUrl?: string | null;
  location?: unknown;
  galleryUrls?: string[] | undefined;
  subcategoryId?: string | null;
  menuUrl?: string | null;
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  socialLinks?: unknown;
}): boolean {
  return (
    body.displayName !== undefined ||
    body.summary !== undefined ||
    body.detail !== undefined ||
    body.bannerUrl !== undefined ||
    body.location !== undefined ||
    body.galleryUrls !== undefined ||
    body.subcategoryId !== undefined ||
    body.menuUrl !== undefined ||
    body.websiteUrl !== undefined ||
    body.bookingUrl !== undefined ||
    body.socialLinks !== undefined
  );
}
