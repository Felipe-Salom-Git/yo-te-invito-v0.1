/**
 * Import legal Markdown from docs/legal/ into LegalDocument DRAFT versions.
 *
 * Does NOT publish automatically unless --publish is passed (use with caution).
 *
 * Usage:
 *   pnpm --filter api run seed:legal-content
 *   pnpm --filter api run seed:legal-content -- --dry-run
 *   pnpm --filter api run seed:legal-content -- --force
 *   pnpm --filter api run seed:legal-content -- --publish
 *
 * Prerequisite: pnpm --filter api run seed:legal-documents
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuditAction, PrismaClient } from '@prisma/client';
import {
  LEGAL_DOCUMENT_SEED_DEFINITIONS,
  type LegalDocumentKey,
} from '@yo-te-invito/shared';
import {
  assertPublishableLegalContent,
} from '../src/modules/legal/legal-content.util';
import {
  EXPECTED_LEGAL_CONTENT_KEYS,
  LEGAL_CONTENT_EXCLUDED_FILES,
  LEGAL_CONTENT_FILE_TO_KEY,
} from './lib/legal-content-import-map';
import {
  extractTitleAndSummary,
  isLegalPlaceholderContent,
  resolveNextDraftVersion,
} from './lib/legal-content-import.util';

const prisma = new PrismaClient();
const TENANT_ID = process.env.LEGAL_SEED_TENANT_ID ?? 'tenant-demo';
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const DOCS_LEGAL_DIR = path.resolve(scriptsDir, '../../../docs/legal');

type ImportAction =
  | 'created draft'
  | 'updated draft'
  | 'skipped'
  | 'would create draft'
  | 'would update draft'
  | 'would skip';

type ImportResult = {
  key: LegalDocumentKey;
  file: string;
  action: ImportAction;
  reason?: string;
  publishedUntouched: boolean;
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const doPublish = args.includes('--publish');

function log(msg: string) {
  console.log(msg);
}

function warn(msg: string) {
  console.warn(`  WARN ${msg}`);
}

function discoverSourceFiles(): Map<LegalDocumentKey, string> {
  const byKey = new Map<LegalDocumentKey, string>();

  if (!fs.existsSync(DOCS_LEGAL_DIR)) {
    throw new Error(`docs/legal directory not found: ${DOCS_LEGAL_DIR}`);
  }

  const entries = fs.readdirSync(DOCS_LEGAL_DIR).filter((f) => f.endsWith('.md'));

  for (const file of entries) {
    if (LEGAL_CONTENT_EXCLUDED_FILES.has(file)) {
      log(`  exclude (not legal content): ${file}`);
      continue;
    }

    const key = LEGAL_CONTENT_FILE_TO_KEY[file];
    if (!key) {
      warn(`unmapped file (skipped): ${file}`);
      continue;
    }

    if (byKey.has(key)) {
      warn(`duplicate mapping for key ${key}; using ${file}`);
    }
    byKey.set(key, path.join(DOCS_LEGAL_DIR, file));
  }

  return byKey;
}

async function importDraftForKey(
  key: LegalDocumentKey,
  filePath: string,
  actorId: string,
): Promise<ImportResult> {
  const fileName = path.basename(filePath);
  const markdown = fs.readFileSync(filePath, 'utf8');

  if (isLegalPlaceholderContent(markdown)) {
    return {
      key,
      file: fileName,
      action: dryRun ? 'would skip' : 'skipped',
      reason: 'source looks like placeholder text',
      publishedUntouched: true,
    };
  }

  const doc = await prisma.legalDocument.findUnique({
    where: { tenantId_key: { tenantId: TENANT_ID, key } },
    include: {
      versions: { select: { id: true, version: true, status: true, contentMarkdown: true } },
    },
  });

  if (!doc) {
    return {
      key,
      file: fileName,
      action: dryRun ? 'would skip' : 'skipped',
      reason: 'document not in DB — run seed:legal-documents first',
      publishedUntouched: true,
    };
  }

  const published = doc.versions.find((v) => v.status === 'PUBLISHED');
  const draft = doc.versions.find((v) => v.status === 'DRAFT');
  const { title, summary } = extractTitleAndSummary(markdown);
  const seedDef = LEGAL_DOCUMENT_SEED_DEFINITIONS.find((d) => d.key === key);

  if (key === 'support_internal_procedure' && doc.visibility !== 'INTERNAL') {
    if (!dryRun) {
      await prisma.legalDocument.update({
        where: { id: doc.id },
        data: { visibility: 'INTERNAL' },
      });
    }
  }

  if (
    draft &&
    !isLegalPlaceholderContent(draft.contentMarkdown) &&
    !force
  ) {
    return {
      key,
      file: fileName,
      action: dryRun ? 'would skip' : 'skipped',
      reason: 'draft already has non-placeholder content (use --force to overwrite)',
      publishedUntouched: !!published,
    };
  }

  if (dryRun) {
    return {
      key,
      file: fileName,
      action: draft ? 'would update draft' : 'would create draft',
      publishedUntouched: !!published,
    };
  }

  let versionRowId: string;
  let action: ImportAction;

  if (draft) {
    const updated = await prisma.legalDocumentVersion.update({
      where: { id: draft.id },
      data: {
        title,
        contentMarkdown: markdown,
        summary: summary ?? seedDef?.description ?? null,
      },
    });
    versionRowId = updated.id;
    action = 'updated draft';
  } else {
    const versionLabel = resolveNextDraftVersion(doc.versions.map((v) => v.version));
    const created = await prisma.legalDocumentVersion.create({
      data: {
        documentId: doc.id,
        version: versionLabel,
        status: 'DRAFT',
        title,
        contentMarkdown: markdown,
        summary: summary ?? seedDef?.description ?? null,
      },
    });
    versionRowId = created.id;
    action = 'created draft';
  }

  if (title && title !== doc.title) {
    await prisma.legalDocument.update({
      where: { id: doc.id },
      data: { title },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: TENANT_ID,
      actorId,
      actorRole: 'SYSTEM',
      action: AuditAction.LEGAL_DOCUMENT_DRAFT_SAVED,
      entityType: 'LegalDocumentVersion',
      entityId: versionRowId,
      after: { title, status: 'DRAFT' },
      metadata: {
        source: 'seed-legal-content',
        file: fileName,
        documentKey: key,
      },
    },
  });

  return {
    key,
    file: fileName,
    action,
    publishedUntouched: !!published,
  };
}

async function publishDraftForKey(
  key: LegalDocumentKey,
  actorId: string,
): Promise<{ ok: boolean; message: string }> {
  const doc = await prisma.legalDocument.findUnique({
    where: { tenantId_key: { tenantId: TENANT_ID, key } },
    include: { versions: true },
  });
  if (!doc) return { ok: false, message: 'document not found' };

  const draft = doc.versions.find((v) => v.status === 'DRAFT');
  if (!draft) return { ok: false, message: 'no draft to publish' };

  try {
    assertPublishableLegalContent(draft.contentMarkdown);
  } catch {
    return { ok: false, message: 'draft not publishable (placeholder or too short)' };
  }

  const previousPublished = doc.versions.find((v) => v.status === 'PUBLISHED');
  const now = new Date();

  const publishedRow = await prisma.$transaction(async (tx) => {
    if (previousPublished && previousPublished.id !== draft.id) {
      await tx.legalDocumentVersion.update({
        where: { id: previousPublished.id },
        data: { status: 'ARCHIVED' },
      });
    }

    const otherPublished = await tx.legalDocumentVersion.findMany({
      where: {
        documentId: doc.id,
        status: 'PUBLISHED',
        NOT: { id: draft.id },
      },
    });
    for (const row of otherPublished) {
      await tx.legalDocumentVersion.update({
        where: { id: row.id },
        data: { status: 'ARCHIVED' },
      });
    }

    return tx.legalDocumentVersion.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
        publishedByUserId: actorId,
      },
    });
  });

  if (previousPublished && previousPublished.id !== draft.id) {
    await prisma.auditLog.create({
      data: {
        tenantId: TENANT_ID,
        actorId,
        actorRole: 'SYSTEM',
        action: AuditAction.LEGAL_DOCUMENT_ARCHIVED,
        entityType: 'LegalDocumentVersion',
        entityId: previousPublished.id,
        metadata: { source: 'seed-legal-content', documentKey: key },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: TENANT_ID,
      actorId,
      actorRole: 'SYSTEM',
      action: AuditAction.LEGAL_DOCUMENT_PUBLISHED,
      entityType: 'LegalDocumentVersion',
      entityId: publishedRow.id,
      metadata: { source: 'seed-legal-content', documentKey: key, visibility: doc.visibility },
    },
  });

  return { ok: true, message: `published ${publishedRow.version}` };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(`Tenant not found: ${TENANT_ID}`);
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, role: 'ADMIN', deletedAt: null },
    select: { id: true },
  });
  const actorId = admin?.id ?? 'seed-legal-content';

  log(`Legal content import — tenant=${TENANT_ID} dir=${DOCS_LEGAL_DIR}`);
  if (dryRun) log('Mode: DRY-RUN (no DB writes)');
  if (force) log('Mode: --force (overwrite non-placeholder drafts)');
  if (doPublish && !dryRun) {
    console.warn('\n⚠️  ADVERTENCIA: --publish publicará borradores importados.');
    console.warn('    Revisá el contenido en /admin/legales antes de usar esto en producción.\n');
  }
  if (doPublish && dryRun) {
    warn('--publish ignored in dry-run mode');
  }

  const sources = discoverSourceFiles();

  log('\nMapeo archivo → key:');
  for (const [key, filePath] of sources) {
    log(`  ${path.basename(filePath)} → ${key}`);
  }

  const missingKeys = EXPECTED_LEGAL_CONTENT_KEYS.filter((k) => !sources.has(k));
  if (missingKeys.length > 0) {
    warn(`missing source files for keys: ${missingKeys.join(', ')}`);
  }

  const results: ImportResult[] = [];
  for (const key of EXPECTED_LEGAL_CONTENT_KEYS) {
    const filePath = sources.get(key);
    if (!filePath) {
      results.push({
        key,
        file: '(missing)',
        action: dryRun ? 'would skip' : 'skipped',
        reason: 'no markdown file in docs/legal',
        publishedUntouched: true,
      });
      continue;
    }
    const result = await importDraftForKey(key, filePath, actorId);
    results.push(result);
    const pubNote = result.publishedUntouched ? '; published untouched' : '';
    const reason = result.reason ? ` (${result.reason})` : '';
    log(`  ${result.key}: ${result.action} ← ${result.file}${reason}${pubNote}`);
  }

  if (doPublish && !dryRun) {
    log('\nPublishing drafts (--publish):');
    for (const r of results) {
      if (r.action !== 'created draft' && r.action !== 'updated draft') {
        log(`  ${r.key}: skip publish (${r.action})`);
        continue;
      }
      const pub = await publishDraftForKey(r.key, actorId);
      log(`  ${r.key}: ${pub.ok ? pub.message : `FAIL — ${pub.message}`}`);
    }
  }

  const imported = results.filter(
    (r) => r.action === 'created draft' || r.action === 'updated draft',
  ).length;
  const skipped = results.filter((r) => r.action === 'skipped').length;

  log(`\nDone: imported=${imported}, skipped=${skipped}, dryRun=${dryRun}`);
  if (!dryRun && imported > 0) {
    log('Next: review drafts at /admin/legales and publish manually when approved.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
