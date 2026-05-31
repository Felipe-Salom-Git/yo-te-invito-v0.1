/**
 * Shared audit + migrate helpers for data:image/ URLs in PostgreSQL image fields.
 * Does not log or persist base64 payloads — only hashes and metadata.
 */

import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { UploadPurpose, UploadScope } from '@yo-te-invito/shared';
import { GcsStorageService } from '../../src/modules/uploads/gcs-storage.service';
import {
  buildPublicObjectKey,
  buildPublicObjectUrl,
  extensionForMime,
} from '../../src/modules/uploads/upload-paths';
import {
  detectImageMime,
  BLOCKED_MIMES,
} from '../../src/modules/uploads/upload-mime.util';
import {
  isPublicUploadConfigured,
  readUploadConfig,
  resolvePublicBaseUrl,
} from '../../src/modules/uploads/upload-config';

export type ScanOptions = {
  tenantId?: string;
  limit?: number;
};

export type MigrationTarget = {
  scope: UploadScope;
  entityId?: string;
  purpose: UploadPurpose;
};

export type DataUrlFinding = {
  table: string;
  field: string;
  /** e.g. galleryUrls[2] for JSON array slots */
  fieldPath: string;
  recordId: string;
  tenantId: string;
  category?: string | null;
  /** Event id when table=EventMedia (GCS entityId) */
  eventId?: string;
  gastroProfileId?: string | null;
  mime: string | null;
  byteLength: number | null;
  contentHash: string | null;
  migratable: boolean;
  skipReason?: string;
  migration?: MigrationTarget;
};

export type AuditSummary = {
  byField: Record<string, number>;
  totalOccurrences: number;
  migratable: number;
  skipped: number;
  findings: DataUrlFinding[];
};

export type MigrateResult = {
  migrated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
};

const DATA_IMAGE_PREFIX = 'data:image/';

export function isDataImageUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith(DATA_IMAGE_PREFIX);
}

export function shortContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

export type ParsedDataImage = {
  declaredMime: string;
  buffer: Buffer;
  byteLength: number;
  contentHash: string;
};

/** Parse data-URL; returns null if invalid, SVG, or blocked MIME. */
export function parseDataImageUrl(value: string): ParsedDataImage | null {
  const trimmed = value.trim();
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?(;base64)?,(.*)$/is.exec(trimmed);
  if (!match) return null;

  const declaredMime = match[1]!.trim().toLowerCase();
  if (BLOCKED_MIMES.has(declaredMime) || declaredMime === 'image/svg+xml') {
    return null;
  }

  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';
  let buffer: Buffer;
  try {
    buffer = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8');
  } catch {
    return null;
  }

  if (buffer.length === 0) return null;

  return {
    declaredMime,
    buffer,
    byteLength: buffer.length,
    contentHash: shortContentHash(buffer),
  };
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

function fieldKey(table: string, fieldPath: string): string {
  return `${table}.${fieldPath}`;
}

function enrichFinding(
  base: Omit<
    DataUrlFinding,
    'mime' | 'byteLength' | 'contentHash' | 'migratable' | 'migration' | 'skipReason'
  >,
  value: string,
): DataUrlFinding {
  const parsed = parseDataImageUrl(value);
  const migration = resolveMigrationTarget(base.table, base.field, base);
  let migratable = Boolean(parsed && migration);
  let skipReason: string | undefined;

  if (!parsed) {
    migratable = false;
    skipReason = 'invalid or unsupported data-URL (SVG/blocked MIME/parse error)';
  } else if (!migration) {
    migratable = false;
    skipReason = 'cannot determine GCS scope/entityId safely';
  }

  const config = readUploadConfig();
  if (parsed && migratable && parsed.byteLength > config.maxImageBytes) {
    migratable = false;
    skipReason = `exceeds max size (${config.maxImageBytes} bytes)`;
  }
  if (parsed && migratable) {
    const detected = detectImageMime(parsed.buffer);
    if (!detected || !config.allowedMimeTypes.has(detected)) {
      migratable = false;
      skipReason = 'magic bytes do not match allowed JPEG/PNG/WEBP';
    }
  }

  return {
    ...base,
    mime: parsed?.declaredMime ?? null,
    byteLength: parsed?.byteLength ?? null,
    contentHash: parsed?.contentHash ?? null,
    migratable,
    skipReason,
    migration: migratable ? migration! : undefined,
  };
}

function resolveMigrationTarget(
  table: string,
  field: string,
  ctx: {
    recordId: string;
    tenantId: string;
    category?: string | null;
    eventId?: string;
    gastroProfileId?: string | null;
  },
): MigrationTarget | null {
  switch (table) {
    case 'Event':
      if (field === 'coverImageUrl') {
        return { scope: 'event', entityId: ctx.recordId, purpose: 'cover' };
      }
      return null;
    case 'EventMedia':
      if (field === 'url' && ctx.eventId) {
        return { scope: 'event', entityId: ctx.eventId, purpose: 'gallery' };
      }
      return null;
    case 'ProducerProfile':
      if (field === 'logoUrl') return { scope: 'producer', entityId: ctx.recordId, purpose: 'logo' };
      if (field === 'coverImageUrl') return { scope: 'producer', entityId: ctx.recordId, purpose: 'cover' };
      if (field === 'galleryUrls') return { scope: 'producer', entityId: ctx.recordId, purpose: 'gallery' };
      return null;
    case 'GastroProfile':
      if (field === 'logoUrl') return { scope: 'gastro', entityId: ctx.recordId, purpose: 'logo' };
      if (field === 'bannerUrl') return { scope: 'gastro', entityId: ctx.recordId, purpose: 'cover' };
      if (field === 'galleryUrls') return { scope: 'gastro', entityId: ctx.recordId, purpose: 'gallery' };
      return null;
    case 'HotelProfile':
      if (field === 'logoUrl') return { scope: 'hotel', entityId: ctx.recordId, purpose: 'logo' };
      if (field === 'bannerUrl') return { scope: 'hotel', entityId: ctx.recordId, purpose: 'cover' };
      if (field === 'galleryUrls') return { scope: 'hotel', entityId: ctx.recordId, purpose: 'gallery' };
      return null;
    case 'GastroContent':
      if (field === 'imageUrl' && ctx.gastroProfileId) {
        return { scope: 'gastro', entityId: ctx.gastroProfileId, purpose: 'content' };
      }
      return null;
    case 'GastroDiscount':
      if ((field === 'displayImageUrls' || field === 'submittedImageUrls') && ctx.gastroProfileId) {
        return { scope: 'gastro', entityId: ctx.gastroProfileId, purpose: 'gallery' };
      }
      return null;
    case 'ContentSubcategory':
      if (field === 'imageUrl') {
        return { scope: 'platform', purpose: 'banner' };
      }
      return null;
    default:
      return null;
  }
}

function pushFinding(findings: DataUrlFinding[], finding: DataUrlFinding, limit?: number) {
  if (limit != null && findings.length >= limit) return false;
  findings.push(finding);
  return true;
}

export async function scanDataUrlFields(
  prisma: PrismaClient,
  options: ScanOptions = {},
): Promise<AuditSummary> {
  const { tenantId, limit } = options;
  const findings: DataUrlFinding[] = [];
  const tenantFilter = tenantId ? { tenantId } : {};

  const stringScans: Array<{
    table: string;
    field: string;
    run: () => Promise<Array<{ id: string; tenantId: string; value: string | null; category?: string | null; gastroProfileId?: string | null; eventId?: string }>>;
  }> = [
    {
      table: 'Event',
      field: 'coverImageUrl',
      run: () =>
        prisma.event.findMany({
          where: { ...tenantFilter, deletedAt: null, coverImageUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, coverImageUrl: true, category: true },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            value: r.coverImageUrl,
            category: r.category,
          })),
        ),
    },
    {
      table: 'ProducerProfile',
      field: 'logoUrl',
      run: () =>
        prisma.producerProfile.findMany({
          where: { ...tenantFilter, logoUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, logoUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.logoUrl }))),
    },
    {
      table: 'ProducerProfile',
      field: 'coverImageUrl',
      run: () =>
        prisma.producerProfile.findMany({
          where: { ...tenantFilter, coverImageUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, coverImageUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.coverImageUrl }))),
    },
    {
      table: 'GastroProfile',
      field: 'logoUrl',
      run: () =>
        prisma.gastroProfile.findMany({
          where: { ...tenantFilter, logoUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, logoUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.logoUrl }))),
    },
    {
      table: 'GastroProfile',
      field: 'bannerUrl',
      run: () =>
        prisma.gastroProfile.findMany({
          where: { ...tenantFilter, bannerUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, bannerUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.bannerUrl }))),
    },
    {
      table: 'HotelProfile',
      field: 'logoUrl',
      run: () =>
        prisma.hotelProfile.findMany({
          where: { ...tenantFilter, logoUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, logoUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.logoUrl }))),
    },
    {
      table: 'HotelProfile',
      field: 'bannerUrl',
      run: () =>
        prisma.hotelProfile.findMany({
          where: { ...tenantFilter, bannerUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, bannerUrl: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, value: r.bannerUrl }))),
    },
    {
      table: 'GastroContent',
      field: 'imageUrl',
      run: () =>
        prisma.gastroContent.findMany({
          where: { ...tenantFilter, imageUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, imageUrl: true, gastroProfileId: true },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            value: r.imageUrl,
            gastroProfileId: r.gastroProfileId,
          })),
        ),
    },
    {
      table: 'ContentSubcategory',
      field: 'imageUrl',
      run: () =>
        prisma.contentSubcategory.findMany({
          where: { ...tenantFilter, imageUrl: { startsWith: DATA_IMAGE_PREFIX } },
          select: { id: true, tenantId: true, imageUrl: true, category: true },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            value: r.imageUrl,
            category: r.category,
          })),
        ),
    },
  ];

  for (const scan of stringScans) {
    const rows = await scan.run();
    for (const row of rows) {
      if (!isDataImageUrl(row.value)) continue;
      const ok = pushFinding(
        findings,
        enrichFinding(
          {
            table: scan.table,
            field: scan.field,
            fieldPath: scan.field,
            recordId: row.id,
            tenantId: row.tenantId,
            category: row.category,
            gastroProfileId: row.gastroProfileId,
          },
          row.value,
        ),
        limit,
      );
      if (!ok) break;
    }
    if (limit != null && findings.length >= limit) break;
  }

  if (limit == null || findings.length < limit) {
    const mediaRows = await prisma.eventMedia.findMany({
      where: {
        deletedAt: null,
        type: 'IMAGE',
        url: { startsWith: DATA_IMAGE_PREFIX },
        ...(tenantId ? { event: { tenantId } } : {}),
      },
      select: { id: true, eventId: true, url: true, event: { select: { tenantId: true, category: true } } },
      take: limit != null ? Math.max(limit - findings.length, 0) : undefined,
    });
    for (const row of mediaRows) {
      if (!isDataImageUrl(row.url)) continue;
      const ok = pushFinding(
        findings,
        enrichFinding(
          {
            table: 'EventMedia',
            field: 'url',
            fieldPath: 'url',
            recordId: row.id,
            eventId: row.eventId,
            tenantId: row.event.tenantId,
            category: row.event.category,
          },
          row.url,
        ),
        limit,
      );
      if (!ok) break;
    }
  }

  const jsonScans: Array<{
    table: string;
    field: string;
    run: () => Promise<Array<{ id: string; tenantId: string; json: unknown; gastroProfileId?: string | null }>>;
  }> = [
    {
      table: 'ProducerProfile',
      field: 'galleryUrls',
      run: () =>
        prisma.producerProfile.findMany({
          where: { ...tenantFilter, galleryUrls: { not: null } },
          select: { id: true, tenantId: true, galleryUrls: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, json: r.galleryUrls }))),
    },
    {
      table: 'GastroProfile',
      field: 'galleryUrls',
      run: () =>
        prisma.gastroProfile.findMany({
          where: { ...tenantFilter, galleryUrls: { not: null } },
          select: { id: true, tenantId: true, galleryUrls: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, json: r.galleryUrls }))),
    },
    {
      table: 'HotelProfile',
      field: 'galleryUrls',
      run: () =>
        prisma.hotelProfile.findMany({
          where: { ...tenantFilter, galleryUrls: { not: null } },
          select: { id: true, tenantId: true, galleryUrls: true },
        }).then((rows) => rows.map((r) => ({ id: r.id, tenantId: r.tenantId, json: r.galleryUrls }))),
    },
    {
      table: 'GastroDiscount',
      field: 'displayImageUrls',
      run: () =>
        prisma.gastroDiscount.findMany({
          where: { ...tenantFilter, displayImageUrls: { not: null } },
          select: { id: true, tenantId: true, displayImageUrls: true, gastroProfileId: true },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            json: r.displayImageUrls,
            gastroProfileId: r.gastroProfileId,
          })),
        ),
    },
    {
      table: 'GastroDiscount',
      field: 'submittedImageUrls',
      run: () =>
        prisma.gastroDiscount.findMany({
          where: { ...tenantFilter, submittedImageUrls: { not: null } },
          select: { id: true, tenantId: true, submittedImageUrls: true, gastroProfileId: true },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            tenantId: r.tenantId,
            json: r.submittedImageUrls,
            gastroProfileId: r.gastroProfileId,
          })),
        ),
    },
  ];

  for (const scan of jsonScans) {
    const rows = await scan.run();
    for (const row of rows) {
      const urls = jsonStringArray(row.json);
      urls.forEach((url, index) => {
        if (!isDataImageUrl(url)) return;
        if (limit != null && findings.length >= limit) return;
        pushFinding(
          findings,
          enrichFinding(
            {
              table: scan.table,
              field: scan.field,
              fieldPath: `${scan.field}[${index}]`,
              recordId: row.id,
              tenantId: row.tenantId,
              gastroProfileId: row.gastroProfileId,
            },
            url,
          ),
          limit,
        );
      });
    }
    if (limit != null && findings.length >= limit) break;
  }

  const byField: Record<string, number> = {};
  let migratable = 0;
  let skipped = 0;
  for (const f of findings) {
    const key = fieldKey(f.table, f.fieldPath);
    byField[key] = (byField[key] ?? 0) + 1;
    if (f.migratable) migratable += 1;
    else skipped += 1;
  }

  return {
    byField,
    totalOccurrences: findings.length,
    migratable,
    skipped,
    findings,
  };
}

export function printAuditReport(summary: AuditSummary, sampleSize = 5): void {
  console.log('=== storage:audit-data-urls ===\n');
  console.log('Fields scanned:');
  console.log('  Event.coverImageUrl, EventMedia.url');
  console.log('  ProducerProfile.logoUrl, coverImageUrl, galleryUrls[]');
  console.log('  GastroProfile.logoUrl, bannerUrl, galleryUrls[]');
  console.log('  GastroContent.imageUrl, GastroDiscount display/submittedImageUrls[]');
  console.log('  HotelProfile.logoUrl, bannerUrl, galleryUrls[]');
  console.log('  ContentSubcategory.imageUrl (platform taxonomy)\n');

  const sorted = Object.entries(summary.byField).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    console.log('No data:image/ URLs found.');
    return;
  }

  console.log('Summary by table.field:');
  for (const [key, count] of sorted) {
    console.log(`  ${key}: ${count}`);
  }
  console.log('');
  console.log(`Total occurrences: ${summary.totalOccurrences}`);
  console.log(`Migratable (valid MIME/size + entity): ${summary.migratable}`);
  console.log(`Skipped / unmigratable: ${summary.skipped}`);

  if (summary.findings.length > 0) {
    console.log(`\nSample (up to ${sampleSize}, no base64):`);
    for (const f of summary.findings.slice(0, sampleSize)) {
      console.log(
        `  ${f.table} id=${f.recordId} tenant=${f.tenantId} ${f.fieldPath} ` +
          `mime=${f.mime ?? '?'} bytes=${f.byteLength ?? '?'} hash=${f.contentHash ?? '?'} ` +
          `migratable=${f.migratable}${f.skipReason ? ` (${f.skipReason})` : ''}`,
      );
    }
  }
}

async function uploadDataUrlToGcs(
  value: string,
  target: MigrationTarget,
): Promise<{ url: string; objectKey: string; bucket: string; contentType: string; size: number }> {
  const config = readUploadConfig();
  if (!isPublicUploadConfigured(config)) {
    throw new Error('GCS_PUBLIC_BUCKET is not configured');
  }

  const parsed = parseDataImageUrl(value);
  if (!parsed) {
    throw new Error('Invalid data-URL');
  }

  const contentType = detectImageMime(parsed.buffer);
  if (!contentType || !config.allowedMimeTypes.has(contentType)) {
    throw new Error('Image magic bytes not allowed');
  }
  if (parsed.byteLength > config.maxImageBytes) {
    throw new Error('Image exceeds max size');
  }

  const ext = extensionForMime(contentType);
  const objectKey = buildPublicObjectKey({
    scope: target.scope,
    entityId: target.entityId,
    purpose: target.purpose,
    ext,
  });

  const gcs = new GcsStorageService();
  const { bucket, objectKey: storedKey } = await gcs.uploadPublicObject({
    objectKey,
    buffer: parsed.buffer,
    contentType,
  });

  const baseUrl = resolvePublicBaseUrl(config);
  const url = buildPublicObjectUrl(baseUrl, storedKey);

  return { url, objectKey: storedKey, bucket, contentType, size: parsed.byteLength };
}

type JsonArrayUpdate = {
  table: string;
  recordId: string;
  field: string;
  index: number;
  newUrl: string;
};

export async function migrateDataUrlFields(
  prisma: PrismaClient,
  options: ScanOptions & { confirm: boolean },
): Promise<MigrateResult> {
  const summary = await scanDataUrlFields(prisma, options);
  const config = readUploadConfig();
  if (options.confirm && !isPublicUploadConfigured(config)) {
    throw new Error('GCS_PUBLIC_BUCKET must be configured before --confirm migrate');
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    options.confirm
      ? '=== storage:migrate-data-urls (APPLY) ==='
      : '=== storage:migrate-data-urls (DRY RUN) ===',
  );
  console.warn('\n⚠️  Run a manual PostgreSQL backup before --confirm (GCS backups do not replace DB rollback).\n');

  for (const finding of summary.findings) {
    if (!finding.migratable || !finding.migration) {
      skipped += 1;
      continue;
    }

    const currentValue = await readCurrentValue(prisma, finding);
    if (!currentValue || !isDataImageUrl(currentValue)) {
      skipped += 1;
      console.log(`SKIP ${finding.table} id=${finding.recordId} ${finding.fieldPath} (value changed or missing)`);
      continue;
    }

    if (!options.confirm) {
      migrated += 1;
      console.log(
        `DRY_RUN table=${finding.table} id=${finding.recordId} field=${finding.fieldPath} ` +
          `hash=${finding.contentHash} scope=${finding.migration.scope} purpose=${finding.migration.purpose}`,
      );
      continue;
    }

    try {
      const uploaded = await uploadDataUrlToGcs(currentValue, finding.migration);
      await applyMigration(prisma, finding, uploaded.url);
      migrated += 1;
      console.log(
        `MIGRATED table=${finding.table} id=${finding.recordId} field=${finding.fieldPath} ` +
          `hash=${finding.contentHash} oldLen=${finding.byteLength} url=${uploaded.url} objectKey=${uploaded.objectKey}`,
      );
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAILED table=${finding.table} id=${finding.recordId} field=${finding.fieldPath}: ${msg}`);
    }
  }

  console.log('');
  console.log(`Migrated: ${migrated}${options.confirm ? '' : ' (would migrate)'}`);
  console.log(`Skipped: ${skipped}`);
  if (options.confirm) console.log(`Failed: ${failed}`);
  if (!options.confirm) {
    console.log('\nNo DB or GCS changes made. Re-run with --confirm after backup to apply.');
  }

  return { migrated, skipped, failed, dryRun: !options.confirm };
}

async function readCurrentValue(
  prisma: PrismaClient,
  finding: DataUrlFinding,
): Promise<string | null> {
  const idxMatch = /^(.+)\[(\d+)\]$/.exec(finding.fieldPath);
  if (idxMatch) {
    const field = idxMatch[1]!;
    const index = Number.parseInt(idxMatch[2]!, 10);
    const row = await readJsonFieldRow(prisma, finding.table, finding.recordId, field);
    if (!row) return null;
    const urls = jsonStringArray(row);
    return urls[index] ?? null;
  }

  switch (finding.table) {
    case 'Event': {
      const row = await prisma.event.findUnique({
        where: { id: finding.recordId },
        select: { coverImageUrl: true },
      });
      return row?.coverImageUrl ?? null;
    }
    case 'EventMedia': {
      const row = await prisma.eventMedia.findUnique({
        where: { id: finding.recordId },
        select: { url: true },
      });
      return row?.url ?? null;
    }
    case 'ProducerProfile': {
      const row = await prisma.producerProfile.findUnique({
        where: { id: finding.recordId },
        select: { logoUrl: true, coverImageUrl: true },
      });
      if (!row) return null;
      if (finding.field === 'logoUrl') return row.logoUrl;
      if (finding.field === 'coverImageUrl') return row.coverImageUrl;
      return null;
    }
    case 'GastroProfile': {
      const row = await prisma.gastroProfile.findUnique({
        where: { id: finding.recordId },
        select: { logoUrl: true, bannerUrl: true },
      });
      if (!row) return null;
      if (finding.field === 'logoUrl') return row.logoUrl;
      if (finding.field === 'bannerUrl') return row.bannerUrl;
      return null;
    }
    case 'HotelProfile': {
      const row = await prisma.hotelProfile.findUnique({
        where: { id: finding.recordId },
        select: { logoUrl: true, bannerUrl: true },
      });
      if (!row) return null;
      if (finding.field === 'logoUrl') return row.logoUrl;
      if (finding.field === 'bannerUrl') return row.bannerUrl;
      return null;
    }
    case 'GastroContent': {
      const row = await prisma.gastroContent.findUnique({
        where: { id: finding.recordId },
        select: { imageUrl: true },
      });
      return row?.imageUrl ?? null;
    }
    case 'ContentSubcategory': {
      const row = await prisma.contentSubcategory.findUnique({
        where: { id: finding.recordId },
        select: { imageUrl: true },
      });
      return row?.imageUrl ?? null;
    }
    default:
      return null;
  }
}

async function readJsonFieldRow(
  prisma: PrismaClient,
  table: string,
  id: string,
  field: string,
): Promise<unknown> {
  switch (table) {
    case 'ProducerProfile':
      return (await prisma.producerProfile.findUnique({ where: { id }, select: { galleryUrls: true } }))?.galleryUrls;
    case 'GastroProfile':
      return (await prisma.gastroProfile.findUnique({ where: { id }, select: { galleryUrls: true } }))?.galleryUrls;
    case 'HotelProfile':
      return (await prisma.hotelProfile.findUnique({ where: { id }, select: { galleryUrls: true } }))?.galleryUrls;
    case 'GastroDiscount': {
      const row = await prisma.gastroDiscount.findUnique({
        where: { id },
        select: { displayImageUrls: true, submittedImageUrls: true },
      });
      if (!row) return null;
      if (field === 'displayImageUrls') return row.displayImageUrls;
      if (field === 'submittedImageUrls') return row.submittedImageUrls;
      return null;
    }
    default:
      return null;
  }
}

async function applyMigration(
  prisma: PrismaClient,
  finding: DataUrlFinding,
  newUrl: string,
): Promise<void> {
  const idxMatch = /^(.+)\[(\d+)\]$/.exec(finding.fieldPath);
  if (idxMatch) {
    const field = idxMatch[1]!;
    const index = Number.parseInt(idxMatch[2]!, 10);
    const current = jsonStringArray(await readJsonFieldRow(prisma, finding.table, finding.recordId, field));
    if (index >= current.length) return;
    current[index] = newUrl;
    await updateJsonArrayField(prisma, finding.table, finding.recordId, field, current);
    return;
  }

  switch (finding.table) {
    case 'Event':
      await prisma.event.update({ where: { id: finding.recordId }, data: { coverImageUrl: newUrl } });
      return;
    case 'EventMedia':
      await prisma.eventMedia.update({ where: { id: finding.recordId }, data: { url: newUrl } });
      return;
    case 'ProducerProfile':
      if (finding.field === 'logoUrl') {
        await prisma.producerProfile.update({ where: { id: finding.recordId }, data: { logoUrl: newUrl } });
      } else if (finding.field === 'coverImageUrl') {
        await prisma.producerProfile.update({ where: { id: finding.recordId }, data: { coverImageUrl: newUrl } });
      }
      return;
    case 'GastroProfile':
      if (finding.field === 'logoUrl') {
        await prisma.gastroProfile.update({ where: { id: finding.recordId }, data: { logoUrl: newUrl } });
      } else if (finding.field === 'bannerUrl') {
        await prisma.gastroProfile.update({ where: { id: finding.recordId }, data: { bannerUrl: newUrl } });
      }
      return;
    case 'HotelProfile':
      if (finding.field === 'logoUrl') {
        await prisma.hotelProfile.update({ where: { id: finding.recordId }, data: { logoUrl: newUrl } });
      } else if (finding.field === 'bannerUrl') {
        await prisma.hotelProfile.update({ where: { id: finding.recordId }, data: { bannerUrl: newUrl } });
      }
      return;
    case 'GastroContent':
      await prisma.gastroContent.update({ where: { id: finding.recordId }, data: { imageUrl: newUrl } });
      return;
    case 'ContentSubcategory':
      await prisma.contentSubcategory.update({ where: { id: finding.recordId }, data: { imageUrl: newUrl } });
      return;
    default:
      return;
  }
}

async function updateJsonArrayField(
  prisma: PrismaClient,
  table: string,
  id: string,
  field: string,
  urls: string[],
): Promise<void> {
  const data = { [field]: urls };
  switch (table) {
    case 'ProducerProfile':
      await prisma.producerProfile.update({ where: { id }, data });
      return;
    case 'GastroProfile':
      await prisma.gastroProfile.update({ where: { id }, data });
      return;
    case 'HotelProfile':
      await prisma.hotelProfile.update({ where: { id }, data });
      return;
    case 'GastroDiscount':
      await prisma.gastroDiscount.update({ where: { id }, data });
      return;
    default:
      return;
  }
}

export function parseCliOptions(argv: string[]): ScanOptions & { confirm: boolean } {
  let tenantId: string | undefined;
  let limit: number | undefined;
  const confirm = argv.includes('--confirm');

  for (const arg of argv) {
    if (arg.startsWith('--tenant=')) tenantId = arg.slice('--tenant='.length).trim() || undefined;
    if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }

  return { tenantId, limit, confirm };
}
