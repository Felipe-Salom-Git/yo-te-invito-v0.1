import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { LegalAcceptanceContext, LegalDocument } from '@prisma/client';
import {
  ErrorCode,
  LEGAL_KEY_TO_SLUG,
  type LegalDocumentKeyValue,
  type MeLegalAcceptRequest,
  type MeLegalAcceptResponse,
  type MeLegalAcceptanceHistoryResponse,
  type MeLegalAcceptanceRecord,
  type MeLegalRequirementItem,
  type MeLegalRequirementsQuery,
  type MeLegalRequirementsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

type AcceptMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class MeLegalService {
  constructor(private readonly prisma: PrismaService) {}

  private matchesContextFlag(
    context: LegalAcceptanceContext,
    doc: Pick<
      LegalDocument,
      'isRequiredForSignup' | 'isRequiredForCheckout' | 'isRequiredForPortalAccess'
    >,
  ): boolean {
    switch (context) {
      case 'SIGNUP':
        return doc.isRequiredForSignup;
      case 'CHECKOUT':
        return doc.isRequiredForCheckout;
      case 'PROFILE_ONBOARDING':
      case 'PORTAL_ACCESS':
        return doc.isRequiredForPortalAccess;
      default:
        return false;
    }
  }

  private matchesProfileType(
    doc: Pick<LegalDocument, 'appliesToProfiles'>,
    profileType?: string,
  ): boolean {
    if (!profileType) return true;
    if (doc.appliesToProfiles.length === 0) return true;
    return doc.appliesToProfiles.includes(profileType);
  }

  private toPublicPaths(key: string): { publicSlug: string | null; publicPath: string | null } {
    const slug = LEGAL_KEY_TO_SLUG[key as LegalDocumentKeyValue];
    if (!slug) return { publicSlug: null, publicPath: null };
    return { publicSlug: slug, publicPath: `/legal/${slug}` };
  }

  async getRequirements(
    tenantId: string,
    userId: string,
    query: MeLegalRequirementsQuery,
  ): Promise<MeLegalRequirementsResponse> {
    const documents = await this.prisma.legalDocument.findMany({
      where: {
        tenantId,
        isActive: true,
        visibility: 'PUBLIC',
      },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    const pending: MeLegalRequirementItem[] = [];

    for (const doc of documents) {
      if (!this.matchesContextFlag(query.context, doc)) continue;
      if (!this.matchesProfileType(doc, query.profileType)) continue;

      const published = doc.versions[0];
      if (!published) continue;

      const existing = await this.prisma.userLegalAcceptance.findUnique({
        where: {
          userId_documentVersionId_context_eventId: {
            userId,
            documentVersionId: published.id,
            context: query.context,
            eventId: '',
          },
        },
      });

      if (existing) continue;

      const paths = this.toPublicPaths(doc.key);
      pending.push({
        documentId: doc.id,
        documentKey: doc.key as LegalDocumentKeyValue,
        title: published.title,
        documentVersionId: published.id,
        version: published.version,
        publishedAt: (published.publishedAt ?? published.updatedAt).toISOString(),
        publicSlug: paths.publicSlug,
        publicPath: paths.publicPath,
        context: query.context,
      });
    }

    pending.sort((a, b) => a.documentKey.localeCompare(b.documentKey));

    return {
      context: query.context,
      profileType: query.profileType ?? null,
      pending,
      allAccepted: pending.length === 0,
    };
  }

  async acceptDocuments(
    tenantId: string,
    userId: string,
    body: MeLegalAcceptRequest,
    meta: AcceptMeta,
  ): Promise<MeLegalAcceptResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }

    const accepted: MeLegalAcceptanceRecord[] = [];
    const alreadyAccepted: string[] = [];

    for (const versionId of body.documentVersionIds) {
      const version = await this.prisma.legalDocumentVersion.findFirst({
        where: { id: versionId },
        include: { document: true },
      });

      if (!version || version.document.tenantId !== tenantId) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: `Legal document version not found: ${versionId}`,
        });
      }

      if (version.status !== 'PUBLISHED') {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Only published versions can be accepted',
          details: { documentVersionId: versionId, status: version.status },
        });
      }

      if (version.document.visibility !== 'PUBLIC' || !version.document.isActive) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Document is not available for public acceptance',
          details: { documentKey: version.document.key },
        });
      }

      const existing = await this.prisma.userLegalAcceptance.findUnique({
        where: {
          userId_documentVersionId_context_eventId: {
            userId,
            documentVersionId: versionId,
            context: body.context,
            eventId: '',
          },
        },
      });

      if (existing) {
        alreadyAccepted.push(versionId);
        accepted.push(this.mapAcceptanceRecord(existing, version.document.key, version));
        continue;
      }

      const row = await this.prisma.userLegalAcceptance.create({
        data: {
          userId,
          documentId: version.documentId,
          documentVersionId: versionId,
          context: body.context,
          eventId: '',
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });

      accepted.push(this.mapAcceptanceRecord(row, version.document.key, version));
    }

    return {
      accepted,
      alreadyAccepted,
      context: body.context,
    };
  }

  private mapAcceptanceRecord(
    row: {
      id: string;
      documentId: string;
      documentVersionId: string;
      context: LegalAcceptanceContext;
      acceptedAt: Date;
    },
    documentKey: string,
    version: { version: string; title: string },
  ): MeLegalAcceptanceRecord {
    return {
      id: row.id,
      documentId: row.documentId,
      documentKey: documentKey as LegalDocumentKeyValue,
      documentVersionId: row.documentVersionId,
      version: version.version,
      title: version.title,
      context: row.context,
      acceptedAt: row.acceptedAt.toISOString(),
    };
  }

  async listAcceptances(
    tenantId: string,
    userId: string,
  ): Promise<MeLegalAcceptanceHistoryResponse> {
    const rows = await this.prisma.userLegalAcceptance.findMany({
      where: { user: { id: userId, tenantId } },
      include: {
        document: { select: { key: true } },
        documentVersion: { select: { version: true, title: true } },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    return {
      data: rows.map((row) =>
        this.mapAcceptanceRecord(row, row.document.key, row.documentVersion),
      ),
    };
  }
}
