import { BadRequestException, Injectable } from '@nestjs/common';
import type { LegalAcceptanceContext, Prisma } from '@prisma/client';
import {
  LEGAL_SIGNUP_ERROR_CODES,
  LEGAL_SIGNUP_USER_MESSAGES,
  type RegistrationProfileType,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPublicLegalRequirements,
  type LegalDocumentWithVersions,
} from './legal-requirements.util';

type AcceptMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class LegalSignupService {
  constructor(private readonly prisma: PrismaService) {}

  async loadPublicDocuments(tenantId: string): Promise<LegalDocumentWithVersions[]> {
    return this.prisma.legalDocument.findMany({
      where: {
        tenantId,
        isActive: true,
        visibility: 'PUBLIC',
      },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });
  }

  async getSignupRequirements(
    tenantId: string,
    profileType?: RegistrationProfileType,
  ) {
    const documents = await this.loadPublicDocuments(tenantId);
    return buildPublicLegalRequirements(documents, 'SIGNUP', profileType);
  }

  /**
   * Validates version IDs for SIGNUP and persists acceptances inside an existing transaction.
   * Throws if catalog requires published docs that are missing or IDs are invalid/incomplete.
   */
  async persistSignupAcceptances(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    profileType: RegistrationProfileType | undefined,
    documentVersionIds: string[],
    meta: AcceptMeta = {},
  ): Promise<void> {
    const documents = await tx.legalDocument.findMany({
      where: {
        tenantId,
        isActive: true,
        visibility: 'PUBLIC',
      },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    const snapshot = buildPublicLegalRequirements(documents, 'SIGNUP', profileType);

    if (!snapshot.canProceed) {
      throw new BadRequestException({
        code: LEGAL_SIGNUP_ERROR_CODES.CONFIG_UNAVAILABLE,
        message: LEGAL_SIGNUP_USER_MESSAGES.configUnavailable,
        details: { missingRequiredDocuments: snapshot.missingRequiredDocuments },
      });
    }

    if (snapshot.required.length === 0) {
      return;
    }

    const requiredIds = new Set(snapshot.required.map((r) => r.documentVersionId));

    if (documentVersionIds.length !== requiredIds.size) {
      throw new BadRequestException({
        code: LEGAL_SIGNUP_ERROR_CODES.MISSING_LEGAL_ACCEPTANCE,
        message: LEGAL_SIGNUP_USER_MESSAGES.missingAcceptanceIds,
      });
    }

    for (const versionId of documentVersionIds) {
      if (!requiredIds.has(versionId)) {
        throw new BadRequestException({
          code: LEGAL_SIGNUP_ERROR_CODES.INVALID_LEGAL_VERSION,
          message: LEGAL_SIGNUP_USER_MESSAGES.invalidDocument,
          details: { documentVersionId: versionId },
        });
      }
    }

    for (const item of snapshot.required) {
      await tx.userLegalAcceptance.upsert({
        where: {
          userId_documentVersionId_context_eventId: {
            userId,
            documentVersionId: item.documentVersionId,
            context: 'SIGNUP',
            eventId: '',
          },
        },
        create: {
          userId,
          documentId: item.documentId,
          documentVersionId: item.documentVersionId,
          context: 'SIGNUP',
          eventId: '',
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
        update: {},
      });
    }
  }
}
