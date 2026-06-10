import { Prisma, type GastroProfile } from '@prisma/client';
import {
  gastroOpeningHoursModeSchema,
  gastroWeeklyOpeningHoursSchema,
  normalizeGastroOpeningHoursMode,
  parseGastroWeeklyOpeningHours,
  rentalOpeningHoursSchema,
  trimToPublicSummary,
  type GastroLocalCreateInput,
  type GastroLocalResponse,
  type GastroOpeningHoursMode,
  type GastroWeeklyOpeningHours,
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

export function readGastroOpeningHoursMode(row: GastroProfile): GastroOpeningHoursMode {
  const weekly = parseGastroWeeklyOpeningHours(row.openingHoursWeekly);
  return normalizeGastroOpeningHoursMode(row.openingHoursMode, weekly);
}

export function readGastroOpeningHoursWeekly(
  row: GastroProfile,
): GastroWeeklyOpeningHours | null {
  return parseGastroWeeklyOpeningHours(row.openingHoursWeekly);
}

export function writeGastroOpeningHoursMode(
  value: GastroLocalCreateInput['openingHoursMode'] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return gastroOpeningHoursModeSchema.parse(value);
}

export function writeGastroOpeningHoursWeekly(
  value: GastroLocalCreateInput['openingHoursWeekly'] | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value == null) return Prisma.JsonNull;
  return gastroWeeklyOpeningHoursSchema.parse(value) as Prisma.InputJsonValue;
}

type GastroOpeningHoursRow = {
  openingHoursMode: string;
  openingHoursWeekly: unknown;
};

export function readGastroOpeningHoursFields(row: GastroOpeningHoursRow): Pick<
  GastroLocalResponse,
  'openingHoursMode' | 'openingHoursWeekly'
> {
  const weekly = parseGastroWeeklyOpeningHours(row.openingHoursWeekly);
  return {
    openingHoursMode: normalizeGastroOpeningHoursMode(row.openingHoursMode, weekly),
    openingHoursWeekly: weekly,
  };
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
