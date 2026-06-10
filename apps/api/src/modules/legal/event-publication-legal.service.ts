import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCode,
  LEGAL_KEY_TO_SLUG,
  type EventPublicationLegalAcceptResponse,
  type EventPublicationLegalStatus,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';

const PRODUCER_TERMS_KEY = 'producer_terms';

type AcceptMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class EventPublicationLegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  private async getPublishedProducerTerms(tenantId: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: {
        tenantId,
        key: PRODUCER_TERMS_KEY,
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
    if (!doc) return null;
    const published = doc.versions[0] ?? null;
    if (!published) return { document: doc, published: null };
    return { document: doc, published };
  }

  private async assertEventAccess(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, producerId: true, producerProfileId: true, status: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === 'ADMIN';
    const canManage =
      isAdmin ||
      (await this.profilesAuth.canManageEvent(tenantId, userId, event));
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Not allowed to access this event',
      });
    }
    return event;
  }

  async getPublicationTermsStatus(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<EventPublicationLegalStatus> {
    await this.assertEventAccess(tenantId, eventId, userId, userRole);

    const terms = await this.getPublishedProducerTerms(tenantId);
    const slug = LEGAL_KEY_TO_SLUG.producer_terms ?? 'productores';
    const publicPath = `/legal/${slug}`;

    if (!terms?.published) {
      return {
        eventId,
        documentKey: 'producer_terms',
        documentPublished: false,
        documentVersionId: null,
        version: null,
        title: terms?.document.title ?? null,
        publicPath,
        accepted: false,
        acceptedAt: null,
        acceptedVersionId: null,
        requiresNewAcceptance: true,
      };
    }

    const acceptance = await this.prisma.userLegalAcceptance.findUnique({
      where: {
        userId_documentVersionId_context_eventId: {
          userId,
          documentVersionId: terms.published.id,
          context: 'EVENT_PUBLICATION',
          eventId,
        },
      },
    });

    const latestAcceptance = acceptance
      ? acceptance
      : await this.prisma.userLegalAcceptance.findFirst({
          where: {
            userId,
            eventId,
            context: 'EVENT_PUBLICATION',
            document: { key: PRODUCER_TERMS_KEY, tenantId },
          },
          orderBy: { acceptedAt: 'desc' },
        });

    const acceptedForCurrentVersion =
      latestAcceptance?.documentVersionId === terms.published.id;

    return {
      eventId,
      documentKey: 'producer_terms',
      documentPublished: true,
      documentVersionId: terms.published.id,
      version: terms.published.version,
      title: terms.published.title,
      publicPath,
      accepted: acceptedForCurrentVersion,
      acceptedAt: acceptedForCurrentVersion
        ? latestAcceptance!.acceptedAt.toISOString()
        : null,
      acceptedVersionId: acceptedForCurrentVersion
        ? latestAcceptance!.documentVersionId
        : null,
      requiresNewAcceptance: !acceptedForCurrentVersion,
    };
  }

  async acceptPublicationTerms(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    meta: AcceptMeta,
  ): Promise<EventPublicationLegalAcceptResponse> {
    await this.assertEventAccess(tenantId, eventId, userId, userRole);

    const terms = await this.getPublishedProducerTerms(tenantId);
    if (!terms?.published) {
      throw new BadRequestException({
        code: ErrorCode.LEGAL_DOCUMENT_NOT_PUBLISHED,
        message:
          'Las condiciones para productoras aún no están publicadas. Contactá al equipo de Yo Te Invito.',
        details: { documentKey: PRODUCER_TERMS_KEY },
      });
    }

    const existing = await this.prisma.userLegalAcceptance.findUnique({
      where: {
        userId_documentVersionId_context_eventId: {
          userId,
          documentVersionId: terms.published.id,
          context: 'EVENT_PUBLICATION',
          eventId,
        },
      },
    });

    if (existing) {
      return {
        eventId,
        documentKey: 'producer_terms',
        documentVersionId: terms.published.id,
        version: terms.published.version,
        acceptedAt: existing.acceptedAt.toISOString(),
        alreadyAccepted: true,
      };
    }

    const row = await this.prisma.userLegalAcceptance.create({
      data: {
        userId,
        documentId: terms.document.id,
        documentVersionId: terms.published.id,
        context: 'EVENT_PUBLICATION',
        eventId,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      eventId,
      documentKey: 'producer_terms',
      documentVersionId: terms.published.id,
      version: terms.published.version,
      acceptedAt: row.acceptedAt.toISOString(),
      alreadyAccepted: false,
    };
  }

  async assertCanSubmitEventForReview(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const status = await this.getPublicationTermsStatus(
      tenantId,
      eventId,
      userId,
      userRole,
    );

    if (!status.documentPublished) {
      throw new BadRequestException({
        code: ErrorCode.LEGAL_DOCUMENT_NOT_PUBLISHED,
        message:
          'No podés enviar el evento a revisión hasta que las condiciones para productoras estén publicadas.',
        details: { documentKey: PRODUCER_TERMS_KEY, publicPath: status.publicPath },
      });
    }

    if (status.requiresNewAcceptance) {
      throw new BadRequestException({
        code: ErrorCode.LEGAL_ACCEPTANCE_REQUIRED,
        message:
          'Debés aceptar las condiciones para productoras antes de enviar el evento a revisión.',
        details: {
          documentKey: PRODUCER_TERMS_KEY,
          documentVersionId: status.documentVersionId,
          publicPath: status.publicPath,
          eventId,
        },
      });
    }
  }
}
