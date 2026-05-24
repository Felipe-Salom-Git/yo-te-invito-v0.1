import type { PrismaClient } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import {
  LEGAL_DOCUMENT_PLACEHOLDER_MARKDOWN,
  LEGAL_DOCUMENT_SEED_DEFINITIONS,
} from '@yo-te-invito/shared';

const INITIAL_VERSION = '1';

/**
 * Idempotent seed: creates base legal documents per tenant with a DRAFT v1 placeholder.
 * Does not overwrite existing document metadata or version content.
 */
export async function seedLegalDocumentsForTenant(
  prisma: PrismaClient,
  tenantId: string,
  options?: { auditActorId?: string; auditActorRole?: string },
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const def of LEGAL_DOCUMENT_SEED_DEFINITIONS) {
    const existing = await prisma.legalDocument.findUnique({
      where: { tenantId_key: { tenantId, key: def.key } },
      include: { versions: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const doc = await prisma.legalDocument.create({
      data: {
        tenantId,
        key: def.key,
        title: def.title,
        description: def.description ?? null,
        visibility: def.visibility,
        appliesToProfiles: def.appliesToProfiles,
        isRequiredForSignup: def.isRequiredForSignup,
        isRequiredForCheckout: def.isRequiredForCheckout,
        isRequiredForPortalAccess: def.isRequiredForPortalAccess,
        isActive: true,
        versions: {
          create: {
            version: INITIAL_VERSION,
            status: 'DRAFT',
            title: def.title,
            contentMarkdown: LEGAL_DOCUMENT_PLACEHOLDER_MARKDOWN,
            summary: 'Versión inicial en borrador',
          },
        },
      },
    });

    created += 1;

    if (options?.auditActorId) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: options.auditActorId,
          actorRole: options.auditActorRole ?? 'SYSTEM',
          action: AuditAction.LEGAL_DOCUMENT_CREATED,
          entityType: 'LegalDocument',
          entityId: doc.id,
          after: { key: def.key, visibility: def.visibility },
          metadata: { source: 'seed-legal-documents' },
        },
      });
    }
  }

  return { created, skipped };
}
