import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  type LegalAcceptanceContext,
  type LegalDocument,
  type LegalDocumentVersion,
} from '@prisma/client';
import {
  ErrorCode,
  LEGAL_KEY_TO_SLUG,
  LEGAL_SLUG_TO_KEY,
  type AdminLegalDocumentDetail,
  type AdminLegalDocumentListItem,
  type AdminLegalDocumentListQuery,
  type AdminLegalDocumentMutationResponse,
  type AdminLegalDocumentVersionsListResponse,
  type AdminPublishLegalDocument,
  type AdminSaveLegalDocumentDraft,
  type AdminUpdateLegalDocument,
  type LegalDocumentKeyValue,
  type LegalDocumentResponse,
  type LegalDocumentVersionResponse,
  type LegalDocumentVersionSummary,
  type MeLegalRequirementItem,
  type PublicLegalDocumentResponse,
  type PublicLegalRequirementsQuery,
  type PublicLegalRequirementsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  assertPublishableLegalContent,
  getNextLegalVersionLabel,
} from './legal-content.util';

const RECENT_VERSIONS_LIMIT = 20;

type ActorContext = { id: string; role: string };

@Injectable()
export class LegalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDocumentResponse(row: LegalDocument): LegalDocumentResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      key: row.key as LegalDocumentKeyValue,
      title: row.title,
      description: row.description,
      visibility: row.visibility,
      appliesToProfiles: [...row.appliesToProfiles],
      isRequiredForSignup: row.isRequiredForSignup,
      isRequiredForCheckout: row.isRequiredForCheckout,
      isRequiredForPortalAccess: row.isRequiredForPortalAccess,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toVersionResponse(row: LegalDocumentVersion): LegalDocumentVersionResponse {
    return {
      id: row.id,
      documentId: row.documentId,
      version: row.version,
      status: row.status,
      title: row.title,
      contentMarkdown: row.contentMarkdown,
      summary: row.summary,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishedByUserId: row.publishedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toVersionSummary(row: LegalDocumentVersion): LegalDocumentVersionSummary {
    const full = this.toVersionResponse(row);
    const { contentMarkdown: _c, ...summary } = full;
    return summary;
  }

  private async findDocumentByKey(tenantId: string, key: string) {
    const doc = await this.prisma.legalDocument.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!doc) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Legal document not found',
      });
    }
    return doc;
  }

  private pickPublishedVersion(
    versions: LegalDocumentVersion[],
  ): LegalDocumentVersion | null {
    const published = versions.filter((v) => v.status === 'PUBLISHED');
    if (published.length === 0) return null;
    return published.sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? b.updatedAt.getTime()) -
        (a.publishedAt?.getTime() ?? a.updatedAt.getTime()),
    )[0]!;
  }

  private pickDraftVersion(versions: LegalDocumentVersion[]): LegalDocumentVersion | null {
    const drafts = versions.filter((v) => v.status === 'DRAFT');
    if (drafts.length === 0) return null;
    return drafts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]!;
  }

  private async loadVersionsForDocuments(documentIds: string[]) {
    if (documentIds.length === 0) return new Map<string, LegalDocumentVersion[]>();
    const versions = await this.prisma.legalDocumentVersion.findMany({
      where: { documentId: { in: documentIds } },
      orderBy: { updatedAt: 'desc' },
    });
    const map = new Map<string, LegalDocumentVersion[]>();
    for (const v of versions) {
      const list = map.get(v.documentId) ?? [];
      list.push(v);
      map.set(v.documentId, list);
    }
    return map;
  }

  async getCurrentDraft(documentId: string): Promise<LegalDocumentVersion | null> {
    return this.prisma.legalDocumentVersion.findFirst({
      where: { documentId, status: 'DRAFT' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPublishedVersion(documentId: string): Promise<LegalDocumentVersion | null> {
    return this.prisma.legalDocumentVersion.findFirst({
      where: { documentId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
  }

  private async getNextLegalVersion(documentId: string): Promise<string> {
    const rows = await this.prisma.legalDocumentVersion.findMany({
      where: { documentId },
      select: { version: true },
    });
    return getNextLegalVersionLabel(rows.map((r) => r.version));
  }

  private async buildMutationResponse(
    doc: LegalDocument,
  ): Promise<AdminLegalDocumentMutationResponse> {
    const versions = await this.prisma.legalDocumentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { updatedAt: 'desc' },
    });
    const published = this.pickPublishedVersion(versions);
    const draft = this.pickDraftVersion(versions);
    return {
      document: this.toDocumentResponse(doc),
      publishedVersion: published ? this.toVersionResponse(published) : null,
      draftVersion: draft ? this.toVersionResponse(draft) : null,
    };
  }

  private publishValidationError(reason: string, message: string): never {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message,
      details: { reason },
    });
  }

  async listAdmin(
    tenantId: string,
    query: AdminLegalDocumentListQuery,
  ): Promise<{ data: AdminLegalDocumentListItem[] }> {
    const docs = await this.prisma.legalDocument.findMany({
      where: {
        tenantId,
        ...(query.visibility ? { visibility: query.visibility } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: { key: 'asc' },
    });

    const versionMap = await this.loadVersionsForDocuments(docs.map((d) => d.id));

    const data: AdminLegalDocumentListItem[] = docs.map((doc) => {
      const versions = versionMap.get(doc.id) ?? [];
      const published = this.pickPublishedVersion(versions);
      const draft = this.pickDraftVersion(versions);
      return {
        key: doc.key as LegalDocumentKeyValue,
        title: doc.title,
        description: doc.description,
        visibility: doc.visibility,
        appliesToProfiles: [...doc.appliesToProfiles],
        isRequiredForSignup: doc.isRequiredForSignup,
        isRequiredForCheckout: doc.isRequiredForCheckout,
        isRequiredForPortalAccess: doc.isRequiredForPortalAccess,
        isActive: doc.isActive,
        publishedVersion: published ? this.toVersionSummary(published) : null,
        draftVersion: draft ? this.toVersionSummary(draft) : null,
        updatedAt: doc.updatedAt.toISOString(),
      };
    });

    return { data };
  }

  async getAdminDetail(tenantId: string, key: string): Promise<AdminLegalDocumentDetail> {
    const doc = await this.findDocumentByKey(tenantId, key);
    const versions = await this.prisma.legalDocumentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { updatedAt: 'desc' },
      take: RECENT_VERSIONS_LIMIT,
    });

    const published = this.pickPublishedVersion(versions);
    const draft = this.pickDraftVersion(versions);

    return {
      document: this.toDocumentResponse(doc),
      publishedVersion: published ? this.toVersionResponse(published) : null,
      draftVersion: draft ? this.toVersionResponse(draft) : null,
      recentVersions: versions.map((v) => this.toVersionSummary(v)),
    };
  }

  async listAdminVersions(
    tenantId: string,
    key: string,
  ): Promise<AdminLegalDocumentVersionsListResponse> {
    const doc = await this.findDocumentByKey(tenantId, key);
    const versions = await this.prisma.legalDocumentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      document: this.toDocumentResponse(doc),
      data: versions.map((v) => this.toVersionSummary(v)),
    };
  }

  async updateDocumentMetadata(
    tenantId: string,
    key: string,
    body: AdminUpdateLegalDocument,
    actor: ActorContext,
  ): Promise<AdminLegalDocumentMutationResponse> {
    const existing = await this.findDocumentByKey(tenantId, key);
    const before = {
      title: existing.title,
      description: existing.description,
      visibility: existing.visibility,
      appliesToProfiles: existing.appliesToProfiles,
      isRequiredForSignup: existing.isRequiredForSignup,
      isRequiredForCheckout: existing.isRequiredForCheckout,
      isRequiredForPortalAccess: existing.isRequiredForPortalAccess,
      isActive: existing.isActive,
    };

    const updated = await this.prisma.legalDocument.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.appliesToProfiles !== undefined && {
          appliesToProfiles: body.appliesToProfiles,
        }),
        ...(body.isRequiredForSignup !== undefined && {
          isRequiredForSignup: body.isRequiredForSignup,
        }),
        ...(body.isRequiredForCheckout !== undefined && {
          isRequiredForCheckout: body.isRequiredForCheckout,
        }),
        ...(body.isRequiredForPortalAccess !== undefined && {
          isRequiredForPortalAccess: body.isRequiredForPortalAccess,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.LEGAL_DOCUMENT_UPDATED,
      entityType: 'LegalDocument',
      entityId: updated.id,
      before,
      after: {
        title: updated.title,
        description: updated.description,
        visibility: updated.visibility,
        appliesToProfiles: updated.appliesToProfiles,
        isRequiredForSignup: updated.isRequiredForSignup,
        isRequiredForCheckout: updated.isRequiredForCheckout,
        isRequiredForPortalAccess: updated.isRequiredForPortalAccess,
        isActive: updated.isActive,
      },
      metadata: {
        documentId: updated.id,
        documentKey: updated.key,
        visibility: updated.visibility,
        requiredFlags: {
          signup: updated.isRequiredForSignup,
          checkout: updated.isRequiredForCheckout,
          portal: updated.isRequiredForPortalAccess,
        },
      },
    });

    return this.buildMutationResponse(updated);
  }

  async saveDraft(
    tenantId: string,
    key: string,
    body: AdminSaveLegalDocumentDraft,
    actor: ActorContext,
  ): Promise<AdminLegalDocumentMutationResponse> {
    const doc = await this.findDocumentByKey(tenantId, key);
    const existingDraft = await this.getCurrentDraft(doc.id);

    let versionRow: LegalDocumentVersion;

    if (existingDraft) {
      versionRow = await this.prisma.legalDocumentVersion.update({
        where: { id: existingDraft.id },
        data: {
          title: body.title,
          contentMarkdown: body.contentMarkdown,
          summary: body.summary ?? null,
        },
      });
    } else {
      const versionLabel = await this.getNextLegalVersion(doc.id);
      versionRow = await this.prisma.legalDocumentVersion.create({
        data: {
          documentId: doc.id,
          version: versionLabel,
          status: 'DRAFT',
          title: body.title,
          contentMarkdown: body.contentMarkdown,
          summary: body.summary ?? null,
        },
      });
    }

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.LEGAL_DOCUMENT_DRAFT_SAVED,
      entityType: 'LegalDocumentVersion',
      entityId: versionRow.id,
      after: {
        version: versionRow.version,
        status: versionRow.status,
        title: versionRow.title,
      },
      metadata: {
        documentId: doc.id,
        documentKey: doc.key,
        versionId: versionRow.id,
        version: versionRow.version,
        visibility: doc.visibility,
      },
    });

    return this.buildMutationResponse(doc);
  }

  async publishDraft(
    tenantId: string,
    key: string,
    body: AdminPublishLegalDocument,
    actor: ActorContext,
  ): Promise<AdminLegalDocumentMutationResponse> {
    const doc = await this.findDocumentByKey(tenantId, key);

    if (!doc.isActive) {
      this.publishValidationError('DOCUMENT_INACTIVE', 'Cannot publish an inactive legal document');
    }

    let draft = body.draftVersionId
      ? await this.prisma.legalDocumentVersion.findFirst({
          where: { id: body.draftVersionId, documentId: doc.id, status: 'DRAFT' },
        })
      : await this.getCurrentDraft(doc.id);

    if (!draft) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No draft version found to publish',
      });
    }

    try {
      assertPublishableLegalContent(draft.contentMarkdown);
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'INVALID_CONTENT';
      if (reason === 'LEGAL_CONTENT_PLACEHOLDER') {
        this.publishValidationError(
          'PLACEHOLDER_CONTENT',
          'Cannot publish placeholder content; complete the document first',
        );
      }
      this.publishValidationError(
        'EMPTY_CONTENT',
        'Cannot publish empty or too short content',
      );
    }

    const versionLabel = body.version ?? draft.version;
    const previousPublished = await this.getPublishedVersion(doc.id);
    const now = new Date();

    const publishedRow = await this.prisma.$transaction(async (tx) => {
      if (previousPublished && previousPublished.id !== draft!.id) {
        await tx.legalDocumentVersion.update({
          where: { id: previousPublished.id },
          data: { status: 'ARCHIVED' },
        });
      }

      const otherPublished = await tx.legalDocumentVersion.findMany({
        where: {
          documentId: doc.id,
          status: 'PUBLISHED',
          NOT: { id: draft!.id },
        },
      });
      for (const row of otherPublished) {
        await tx.legalDocumentVersion.update({
          where: { id: row.id },
          data: { status: 'ARCHIVED' },
        });
      }

      return tx.legalDocumentVersion.update({
        where: { id: draft!.id },
        data: {
          status: 'PUBLISHED',
          version: versionLabel,
          publishedAt: now,
          publishedByUserId: actor.id,
        },
      });
    });

    if (previousPublished && previousPublished.id !== draft.id) {
      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: AuditAction.LEGAL_DOCUMENT_ARCHIVED,
        entityType: 'LegalDocumentVersion',
        entityId: previousPublished.id,
        before: { status: 'PUBLISHED', version: previousPublished.version },
        after: { status: 'ARCHIVED', version: previousPublished.version },
        metadata: {
          documentId: doc.id,
          documentKey: doc.key,
          versionId: previousPublished.id,
          version: previousPublished.version,
          previousPublishedVersionId: previousPublished.id,
          visibility: doc.visibility,
        },
      });
    }

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.LEGAL_DOCUMENT_PUBLISHED,
      entityType: 'LegalDocumentVersion',
      entityId: publishedRow.id,
      before: { status: 'DRAFT', version: draft.version },
      after: {
        status: 'PUBLISHED',
        version: publishedRow.version,
        publishedAt: publishedRow.publishedAt?.toISOString(),
      },
      metadata: {
        documentId: doc.id,
        documentKey: doc.key,
        versionId: publishedRow.id,
        version: publishedRow.version,
        previousPublishedVersionId: previousPublished?.id ?? null,
        visibility: doc.visibility,
        requiredFlags: {
          signup: doc.isRequiredForSignup,
          checkout: doc.isRequiredForCheckout,
          portal: doc.isRequiredForPortalAccess,
        },
      },
    });

    return this.buildMutationResponse(doc);
  }

  async getPublicBySlug(
    tenantId: string,
    slug: string,
  ): Promise<PublicLegalDocumentResponse> {
    const key = LEGAL_SLUG_TO_KEY[slug];
    if (!key) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Legal document not found',
      });
    }

    const doc = await this.prisma.legalDocument.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    if (!doc || !doc.isActive || doc.visibility !== 'PUBLIC') {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Legal document not found',
      });
    }

    const published = await this.prisma.legalDocumentVersion.findFirst({
      where: {
        documentId: doc.id,
        status: 'PUBLISHED',
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (!published) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No published version available',
      });
    }

    const publicSlug = LEGAL_KEY_TO_SLUG[key] ?? slug;

    return {
      documentId: doc.id,
      documentVersionId: published.id,
      key,
      slug: publicSlug,
      title: published.title,
      version: published.version,
      contentMarkdown: published.contentMarkdown,
      publishedAt: (published.publishedAt ?? published.updatedAt).toISOString(),
    };
  }

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

  async getPublicRequirements(
    tenantId: string,
    query: PublicLegalRequirementsQuery,
  ): Promise<PublicLegalRequirementsResponse> {
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

    const required: MeLegalRequirementItem[] = [];

    for (const doc of documents) {
      if (!this.matchesContextFlag(query.context, doc)) continue;
      if (!this.matchesProfileType(doc, query.profileType)) continue;

      const published = doc.versions[0];
      if (!published) continue;

      const slug = LEGAL_KEY_TO_SLUG[doc.key as LegalDocumentKeyValue];
      required.push({
        documentId: doc.id,
        documentKey: doc.key as LegalDocumentKeyValue,
        title: published.title,
        documentVersionId: published.id,
        version: published.version,
        publishedAt: (published.publishedAt ?? published.updatedAt).toISOString(),
        publicSlug: slug ?? null,
        publicPath: slug ? `/legal/${slug}` : null,
        context: query.context,
      });
    }

    required.sort((a, b) => a.documentKey.localeCompare(b.documentKey));

    return {
      context: query.context,
      profileType: query.profileType ?? null,
      required,
    };
  }
}
