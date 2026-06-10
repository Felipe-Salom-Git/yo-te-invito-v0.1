/**
 * Read-only audit of legal document draft/publish state for V3.1 Stage 11.
 * Run: pnpm --filter api exec tsx scripts/audit-legal-publication-status.ts
 */
import { PrismaClient } from '@prisma/client';
import { LEGAL_KEY_TO_SLUG } from '@yo-te-invito/shared';

const TENANT_ID = process.env.LEGAL_SEED_TENANT_ID ?? 'tenant-demo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.legalDocument.findMany({
      where: { tenantId: TENANT_ID },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { key: 'asc' },
    });

    const rows = docs.map((doc) => {
      const draft = doc.versions.find((v) => v.status === 'DRAFT') ?? null;
      const published = doc.versions.find((v) => v.status === 'PUBLISHED') ?? null;
      const slug = LEGAL_KEY_TO_SLUG[doc.key as keyof typeof LEGAL_KEY_TO_SLUG] ?? null;
      return {
        key: doc.key,
        slug,
        visibility: doc.visibility,
        isActive: doc.isActive,
        signup: doc.isRequiredForSignup,
        checkout: doc.isRequiredForCheckout,
        portal: doc.isRequiredForPortalAccess,
        draftVersion: draft?.version ?? null,
        draftTitle: draft?.title ?? null,
        publishedVersion: published?.version ?? null,
        publishedTitle: published?.title ?? null,
        publishedAt: published?.publishedAt?.toISOString() ?? null,
        archivedCount: doc.versions.filter((v) => v.status === 'ARCHIVED').length,
      };
    });

    console.log(JSON.stringify({ tenantId: TENANT_ID, count: rows.length, documents: rows }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
