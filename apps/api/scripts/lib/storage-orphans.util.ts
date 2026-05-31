/**
 * GCS public bucket orphan detection — compare object keys under public/
 * against image URLs referenced in PostgreSQL.
 */

import { createHash } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import type { PrismaClient } from '@prisma/client';
import { readUploadConfig, type UploadConfig } from '../../src/modules/uploads/upload-config';
import { isDataImageUrl } from './storage-data-url.util';

export const DEFAULT_MIN_AGE_HOURS = 48;

export type OrphanScanOptions = {
  /** Only consider objects older than this (hours). Default 48. */
  minAgeHours?: number;
  /** Max orphan rows to return (audit). */
  limit?: number;
};

export type OrphanCandidate = {
  objectKey: string;
  ageHours: number;
  updatedAt: string;
  deletable: boolean;
  skipReason?: string;
};

export type OrphanAuditSummary = {
  bucket: string;
  referencedKeyCount: number;
  listedObjectCount: number;
  orphanCount: number;
  skippedRecent: number;
  skippedUncertain: number;
  orphans: OrphanCandidate[];
  warnings: string[];
};

const SAFE_KEY_PREFIX =
  /^public\/(events|producers|gastro|rentals|hotels|excursions|platform)\/[a-zA-Z0-9_-]+\//;

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

/** Normalize a stored URL to a GCS object key (public/…), or null if external / data-URL. */
export function urlToPublicObjectKey(url: string, config: UploadConfig): string | null {
  const trimmed = url.trim();
  if (!trimmed || isDataImageUrl(trimmed)) return null;

  const bucket = config.publicBucket;
  if (!bucket) return null;

  try {
    const u = new URL(trimmed);
    let path = decodeURIComponent(u.pathname.replace(/^\//, ''));

    if (path.startsWith(`${bucket}/`)) {
      path = path.slice(bucket.length + 1);
    }

    if (path.startsWith('public/')) {
      return path;
    }

    if (config.publicBaseUrl) {
      const base = config.publicBaseUrl.replace(/\/$/, '');
      if (trimmed.startsWith(base)) {
        const suffix = trimmed.slice(base.length).replace(/^\//, '');
        if (suffix.startsWith('public/')) return suffix;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function addKey(set: Set<string>, url: string | null | undefined, config: UploadConfig) {
  if (!url?.trim()) return;
  const key = urlToPublicObjectKey(url, config);
  if (key) set.add(key);
}

function addKeysFromJson(set: Set<string>, value: unknown, config: UploadConfig) {
  for (const url of jsonStringArray(value)) {
    addKey(set, url, config);
  }
}

/** Collect all object keys referenced by image URL columns in the database. */
export async function collectReferencedPublicObjectKeys(
  prisma: PrismaClient,
): Promise<{ keys: Set<string>; warnings: string[] }> {
  const config = readUploadConfig();
  const keys = new Set<string>();
  const warnings: string[] = [];

  if (!config.publicBucket) {
    warnings.push('GCS_PUBLIC_BUCKET not configured — reference scan still runs for URL shapes.');
  }

  const events = await prisma.event.findMany({
    where: { deletedAt: null, coverImageUrl: { not: null } },
    select: { coverImageUrl: true },
  });
  for (const row of events) addKey(keys, row.coverImageUrl, config);

  const media = await prisma.eventMedia.findMany({
    where: { deletedAt: null, type: 'IMAGE' },
    select: { url: true },
  });
  for (const row of media) addKey(keys, row.url, config);

  const producers = await prisma.producerProfile.findMany({
    select: { logoUrl: true, coverImageUrl: true, galleryUrls: true },
  });
  for (const row of producers) {
    addKey(keys, row.logoUrl, config);
    addKey(keys, row.coverImageUrl, config);
    addKeysFromJson(keys, row.galleryUrls, config);
  }

  const gastroProfiles = await prisma.gastroProfile.findMany({
    select: { logoUrl: true, bannerUrl: true, galleryUrls: true },
  });
  for (const row of gastroProfiles) {
    addKey(keys, row.logoUrl, config);
    addKey(keys, row.bannerUrl, config);
    addKeysFromJson(keys, row.galleryUrls, config);
  }

  const gastroContent = await prisma.gastroContent.findMany({
    where: { imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  for (const row of gastroContent) addKey(keys, row.imageUrl, config);

  const gastroDiscounts = await prisma.gastroDiscount.findMany({
    select: { displayImageUrls: true, submittedImageUrls: true },
  });
  for (const row of gastroDiscounts) {
    addKeysFromJson(keys, row.displayImageUrls, config);
    addKeysFromJson(keys, row.submittedImageUrls, config);
  }

  const hotels = await prisma.hotelProfile.findMany({
    select: { logoUrl: true, bannerUrl: true, galleryUrls: true },
  });
  for (const row of hotels) {
    addKey(keys, row.logoUrl, config);
    addKey(keys, row.bannerUrl, config);
    addKeysFromJson(keys, row.galleryUrls, config);
  }

  const subcategories = await prisma.contentSubcategory.findMany({
    where: { imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  for (const row of subcategories) addKey(keys, row.imageUrl, config);

  warnings.push(
    'Reference scan excludes TicketTemplate JSON and external CDN URLs — orphans under public/ may include ticket-studio assets; review before --confirm.',
  );

  return { keys, warnings };
}

function createStorageClient(config: UploadConfig): Storage {
  const options: ConstructorParameters<typeof Storage>[0] = {};
  if (config.projectId) options.projectId = config.projectId;
  if (config.serviceAccountKeyFile) options.keyFilename = config.serviceAccountKeyFile;
  return new Storage(options);
}

export async function listPublicBucketObjects(
  config: UploadConfig,
): Promise<Array<{ objectKey: string; updated: Date }>> {
  const bucketName = config.publicBucket;
  if (!bucketName) {
    throw new Error('GCS_PUBLIC_BUCKET is not configured');
  }

  const storage = createStorageClient(config);
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix: 'public/' });

  const out: Array<{ objectKey: string; updated: Date }> = [];
  for (const file of files) {
    if (!file.name || file.name.endsWith('/')) continue;
    const updatedRaw = file.metadata?.updated ?? file.metadata?.timeCreated;
    const updated = updatedRaw ? new Date(updatedRaw) : new Date(0);
    out.push({ objectKey: file.name, updated });
  }
  return out;
}

function classifyOrphan(
  objectKey: string,
  updated: Date,
  minAgeHours: number,
): OrphanCandidate {
  const ageMs = Date.now() - updated.getTime();
  const ageHours = Math.round((ageMs / (60 * 60 * 1000)) * 10) / 10;

  if (ageMs < minAgeHours * 60 * 60 * 1000) {
    return {
      objectKey,
      ageHours,
      updatedAt: updated.toISOString(),
      deletable: false,
      skipReason: `younger than ${minAgeHours}h grace period`,
    };
  }

  if (!SAFE_KEY_PREFIX.test(objectKey)) {
    return {
      objectKey,
      ageHours,
      updatedAt: updated.toISOString(),
      deletable: false,
      skipReason: 'object key outside known public/* layout — manual review',
    };
  }

  return {
    objectKey,
    ageHours,
    updatedAt: updated.toISOString(),
    deletable: true,
  };
}

export async function auditPublicBucketOrphans(
  prisma: PrismaClient,
  options: OrphanScanOptions = {},
): Promise<OrphanAuditSummary> {
  const config = readUploadConfig();
  if (!config.publicBucket) {
    throw new Error('GCS_PUBLIC_BUCKET is not configured');
  }

  const minAgeHours = options.minAgeHours ?? DEFAULT_MIN_AGE_HOURS;
  const { keys: referenced, warnings } = await collectReferencedPublicObjectKeys(prisma);
  const objects = await listPublicBucketObjects(config);

  const orphans: OrphanCandidate[] = [];
  let skippedRecent = 0;
  let skippedUncertain = 0;

  for (const obj of objects) {
    if (referenced.has(obj.objectKey)) continue;

    const candidate = classifyOrphan(obj.objectKey, obj.updated, minAgeHours);
    if (!candidate.deletable) {
      if (candidate.skipReason?.includes('grace')) skippedRecent += 1;
      else skippedUncertain += 1;
    }

    if (options.limit != null && orphans.length >= options.limit) continue;
    orphans.push(candidate);
  }

  return {
    bucket: config.publicBucket,
    referencedKeyCount: referenced.size,
    listedObjectCount: objects.length,
    orphanCount: orphans.length,
    skippedRecent,
    skippedUncertain,
    orphans,
    warnings,
  };
}

export function printOrphanAuditReport(summary: OrphanAuditSummary, sampleSize = 20): void {
  console.log('=== storage:audit-orphans ===\n');
  console.log(`Bucket: ${summary.bucket} (prefix public/ only)`);
  console.log(`Referenced keys in DB: ${summary.referencedKeyCount}`);
  console.log(`Objects listed in GCS: ${summary.listedObjectCount}`);
  console.log(`Orphan candidates: ${summary.orphanCount}`);
  console.log(`  Skipped (too recent): ${summary.skippedRecent}`);
  console.log(`  Skipped (uncertain path): ${summary.skippedUncertain}`);
  console.log('');

  for (const w of summary.warnings) {
    console.log(`⚠️  ${w}`);
  }
  console.log('');

  if (summary.orphans.length === 0) {
    console.log('No orphan candidates found.');
    return;
  }

  console.log(`Sample orphans (up to ${sampleSize}):`);
  for (const o of summary.orphans.slice(0, sampleSize)) {
    console.log(
      `  ${o.objectKey} age=${o.ageHours}h updated=${o.updatedAt} deletable=${o.deletable}` +
        (o.skipReason ? ` (${o.skipReason})` : ''),
    );
  }

  const deletable = summary.orphans.filter((o) => o.deletable).length;
  console.log('');
  console.log(`Deletable orphans (after grace + path rules): ${deletable}`);
  console.log('Run storage:cleanup-orphans -- --dry-run to preview deletion.');
}

export async function cleanupPublicBucketOrphans(
  prisma: PrismaClient,
  options: OrphanScanOptions & { confirm: boolean },
): Promise<{ deleted: number; skipped: number; dryRun: boolean }> {
  const summary = await auditPublicBucketOrphans(prisma, options);
  const config = readUploadConfig();
  if (!config.publicBucket) {
    throw new Error('GCS_PUBLIC_BUCKET is not configured');
  }

  const storage = createStorageClient(config);
  const bucket = storage.bucket(config.publicBucket);

  let deleted = 0;
  let skipped = 0;

  console.log(
    options.confirm
      ? '=== storage:cleanup-orphans (APPLY) ==='
      : '=== storage:cleanup-orphans (DRY RUN) ===',
  );
  console.warn('\n⚠️  Never run --confirm in production without manual review of audit output.');
  console.warn('⚠️  Does not touch yti-prod-storage, backups/postgres/, or private/*.\n');

  for (const orphan of summary.orphans) {
    if (!orphan.deletable) {
      skipped += 1;
      continue;
    }

    if (!options.confirm) {
      deleted += 1;
      console.log(
        `DRY_DELETE objectKey=${orphan.objectKey} age=${orphan.ageHours}h reason=unreferenced`,
      );
      continue;
    }

    try {
      await bucket.file(orphan.objectKey).delete({ ignoreNotFound: true });
      deleted += 1;
      console.log(
        `DELETED objectKey=${orphan.objectKey} age=${orphan.ageHours}h hash=${shortKeyHash(orphan.objectKey)}`,
      );
    } catch (err) {
      skipped += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAILED objectKey=${orphan.objectKey}: ${msg}`);
    }
  }

  console.log('');
  console.log(`${options.confirm ? 'Deleted' : 'Would delete'}: ${deleted}`);
  console.log(`Skipped: ${skipped}`);
  if (!options.confirm) {
    console.log('\nNo objects deleted. Re-run with --confirm after review.');
  }

  return { deleted, skipped, dryRun: !options.confirm };
}

function shortKeyHash(objectKey: string): string {
  return createHash('sha256').update(objectKey).digest('hex').slice(0, 12);
}

export function parseOrphanCliOptions(argv: string[]): OrphanScanOptions & { confirm: boolean } {
  let minAgeHours = DEFAULT_MIN_AGE_HOURS;
  let limit: number | undefined;
  const confirm = argv.includes('--confirm');
  const dryRunExplicit = argv.includes('--dry-run');

  for (const arg of argv) {
    if (arg.startsWith('--min-age-hours=')) {
      const n = Number.parseFloat(arg.slice('--min-age-hours='.length));
      if (Number.isFinite(n) && n >= 0) minAgeHours = n;
    }
    if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }

  if (confirm && dryRunExplicit) {
    console.warn('--dry-run ignored when --confirm is set');
  }

  return { minAgeHours, limit, confirm: confirm && !dryRunExplicit };
}
