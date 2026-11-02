import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GastroProfile } from '@prisma/client';
import {
  ErrorCode,
  GASTRO_PROMO_EVENT_SUBMITTABLE_STATUSES,
  type GastroPromoEventCreateInput,
  type GastroPromoEventListResponse,
  type GastroPromoEventResponse,
  type GastroPromoEventStatus,
  type GastroPromoEventUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalAlertsEmailService } from '../../email/operational-alerts-email.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { mapEventTagsPublic, syncEventTags, validateEventTagIds } from '../../common/event-tags.util';
import { GastroOwnershipService } from './gastro-ownership.service';

/** Promo events are discovery `event`s: never the local's page-event category (`gastro`). */
const PROMO_EVENT_CATEGORY = 'event';

const PROMO_EVENT_INCLUDE = {
  media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' as const } },
  subcategory: { select: { name: true } },
  eventTags: { include: { tag: true } },
};

type PromoEventRow = {
  id: string;
  gastroProfileId: string | null;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startAt: Date;
  endAt: Date | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  province: string | null;
  subcategoryId: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  media: Array<{ url: string }>;
  subcategory: { name: string } | null;
  eventTags: Array<{ tag: { id: string; name: string; slug: string; isActive: boolean } }>;
};

/**
 * G12.2 — Promotional events of a gastro local: `Event` (category `event`, publicity only, no
 * ticketing) owned by `gastroProfileId`. Same lifecycle as producer publicity events
 * (DRAFT → PENDING → ADMIN approve/reject).
 * G12.2 — Eventos publicitarios del local: `Event` sin ticketera con dueño `gastroProfileId`.
 */
@Injectable()
export class GastroPromoEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: GastroOwnershipService,
    private readonly subcategories: SubcategoriesService,
    private readonly operationalAlerts: OperationalAlertsEmailService,
  ) {}

  private toResponse(row: PromoEventRow): GastroPromoEventResponse {
    return {
      id: row.id,
      gastroProfileId: row.gastroProfileId!,
      title: row.title,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      galleryUrls: row.media.map((m) => m.url),
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null,
      venueName: row.venueName,
      venueAddress: row.venueAddress,
      city: row.city,
      province: row.province,
      subcategoryId: row.subcategoryId,
      subcategoryName: row.subcategory?.name ?? null,
      tags: mapEventTagsPublic(row.eventTags),
      status: row.status as GastroPromoEventStatus,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Canonical access = tenant + the local's membership (or ADMIN in tenant). Never userId alone. */
  private async assertProfileAccess(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string,
  ): Promise<GastroProfile> {
    if (userRole === 'ADMIN') {
      const profile = await this.prisma.gastroProfile.findFirst({ where: { id: profileId, tenantId } });
      if (!profile) {
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Gastro location not found' });
      }
      return profile;
    }
    return this.ownership.assertCanManageProfile(tenantId, userId, profileId);
  }

  private assertCanSubmit(profile: GastroProfile) {
    if (profile.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'El local debe estar activo para enviar eventos a revisión',
      });
    }
  }

  private async loadForManage(tenantId: string, userId: string, userRole: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null, gastroProfileId: { not: null } },
      include: PROMO_EVENT_INCLUDE,
    });
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    const profile = await this.assertProfileAccess(tenantId, userId, userRole, event.gastroProfileId!);
    return { event, profile };
  }

  private async resolveSubcategoryId(tenantId: string, subcategoryId: string | null | undefined) {
    return this.subcategories.resolveSubcategoryForEvent(tenantId, PROMO_EVENT_CATEGORY, subcategoryId ?? null);
  }

  private notifyPending(event: { id: string; title: string; city: string | null; updatedAt: Date }, localName: string) {
    try {
      this.operationalAlerts.notifyNewEventPending({
        eventId: event.id,
        eventTitle: event.title,
        producerName: `Local gastronómico · ${localName}`,
        categoryName: 'Eventos',
        city: event.city,
        createdAt: event.updatedAt.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }),
      });
    } catch {
      // fire-and-forget: never block the portal action
    }
  }

  async list(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId?: string,
  ): Promise<GastroPromoEventListResponse> {
    const resolvedId =
      profileId?.trim() || (await this.ownership.resolveManagedProfileId(tenantId, userId, null));
    await this.assertProfileAccess(tenantId, userId, userRole, resolvedId);
    const rows = await this.prisma.event.findMany({
      where: { tenantId, gastroProfileId: resolvedId, deletedAt: null },
      include: PROMO_EVENT_INCLUDE,
      orderBy: { startAt: 'desc' },
    });
    return { profileId: resolvedId, data: rows.map((r) => this.toResponse(r)) };
  }

  async get(tenantId: string, userId: string, userRole: string, eventId: string) {
    const { event } = await this.loadForManage(tenantId, userId, userRole, eventId);
    return this.toResponse(event);
  }

  async create(
    tenantId: string,
    userId: string,
    userRole: string,
    input: GastroPromoEventCreateInput,
  ): Promise<GastroPromoEventResponse> {
    const profile = await this.assertProfileAccess(tenantId, userId, userRole, input.profileId);
    if (input.submitForReview) this.assertCanSubmit(profile);

    const subcategoryId = await this.resolveSubcategoryId(tenantId, input.subcategoryId);
    const tagIds = await validateEventTagIds(this.prisma, tenantId, PROMO_EVENT_CATEGORY, input.tagIds ?? []);
    const gallery = input.galleryUrls ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId,
          producerId: userId,
          producerProfileId: null,
          gastroProfileId: profile.id,
          category: PROMO_EVENT_CATEGORY,
          subcategoryId,
          title: input.title,
          description: input.description ?? null,
          startAt: new Date(input.startAt),
          endAt: input.endAt ? new Date(input.endAt) : null,
          venueName: input.venueName?.trim() || profile.displayName,
          venueAddress: input.venueAddress?.trim() || profile.address,
          city: input.city?.trim() || profile.city,
          province: input.province?.trim() || profile.province,
          googlePlaceId: input.venueAddress?.trim() ? null : profile.googlePlaceId,
          geoLat: input.venueAddress?.trim() ? null : profile.geoLat,
          geoLng: input.venueAddress?.trim() ? null : profile.geoLng,
          coverImageUrl: input.coverImageUrl ?? gallery[0] ?? null,
          status: input.submitForReview ? 'PENDING' : 'DRAFT',
          isTicketingEnabled: false,
          isGeneralPublication: true,
        },
      });
      if (gallery.length > 0) {
        await tx.eventMedia.createMany({
          data: gallery.map((url, i) => ({ eventId: event.id, type: 'IMAGE', url, sortOrder: i })),
        });
      }
      await syncEventTags(tx, event.id, tagIds);
      return tx.event.findFirstOrThrow({ where: { id: event.id }, include: PROMO_EVENT_INCLUDE });
    });

    if (created.status === 'PENDING') this.notifyPending(created, profile.displayName);
    return this.toResponse(created);
  }

  async update(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
    input: GastroPromoEventUpdateInput,
  ): Promise<GastroPromoEventResponse> {
    const { event } = await this.loadForManage(tenantId, userId, userRole, eventId);
    if (input.startAt && input.endAt === undefined && event.endAt && event.endAt < new Date(input.startAt)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'La fecha de fin no puede ser anterior al inicio',
      });
    }
    const subcategoryId =
      input.subcategoryId !== undefined ? await this.resolveSubcategoryId(tenantId, input.subcategoryId) : undefined;
    const tagIds =
      input.tagIds !== undefined
        ? await validateEventTagIds(this.prisma, tenantId, PROMO_EVENT_CATEGORY, input.tagIds)
        : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl ?? null }),
          ...(input.startAt !== undefined && { startAt: new Date(input.startAt) }),
          ...(input.endAt !== undefined && { endAt: input.endAt ? new Date(input.endAt) : null }),
          ...(input.venueName !== undefined && { venueName: input.venueName ?? null }),
          ...(input.venueAddress !== undefined && { venueAddress: input.venueAddress ?? null }),
          ...(input.city !== undefined && { city: input.city ?? null }),
          ...(input.province !== undefined && { province: input.province ?? null }),
          ...(subcategoryId !== undefined && { subcategoryId }),
        },
      });
      if (input.galleryUrls !== undefined) {
        await tx.eventMedia.updateMany({ where: { eventId, deletedAt: null }, data: { deletedAt: new Date() } });
        if (input.galleryUrls.length > 0) {
          await tx.eventMedia.createMany({
            data: input.galleryUrls.map((url, i) => ({ eventId, type: 'IMAGE', url, sortOrder: i })),
          });
        }
      }
      if (tagIds !== undefined) await syncEventTags(tx, eventId, tagIds);
      return tx.event.findFirstOrThrow({ where: { id: eventId }, include: PROMO_EVENT_INCLUDE });
    });
    return this.toResponse(updated);
  }

  /** DRAFT / rejected (CANCELLED) → PENDING; ADMIN approves with the existing event moderation. */
  async submit(tenantId: string, userId: string, userRole: string, eventId: string) {
    const { event, profile } = await this.loadForManage(tenantId, userId, userRole, eventId);
    if (!GASTRO_PROMO_EVENT_SUBMITTABLE_STATUSES.includes(event.status as GastroPromoEventStatus)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se pueden enviar a revisión borradores o eventos rechazados',
      });
    }
    this.assertCanSubmit(profile);
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: 'PENDING' },
      include: PROMO_EVENT_INCLUDE,
    });
    this.notifyPending(updated, profile.displayName);
    return this.toResponse(updated);
  }

  /** Soft delete (keeps history); removes it from discovery and the local's page. */
  async archive(tenantId: string, userId: string, userRole: string, eventId: string) {
    await this.loadForManage(tenantId, userId, userRole, eventId);
    await this.prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
    return { id: eventId, archived: true as const };
  }
}
