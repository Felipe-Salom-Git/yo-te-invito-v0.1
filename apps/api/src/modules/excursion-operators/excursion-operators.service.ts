import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Event,
  type EventStatus,
  type ExcursionOperator,
} from '@prisma/client';
import {
  ErrorCode,
  parseRentalOpeningHours,
  rentalOpeningHoursSchema,
  type AdminExcursionOperatorsListQuery,
  type CreateExcursionOperatorBody,
  type CreateExcursionProductBody,
  type ExcursionOperatorDetail,
  type ExcursionOperatorSummary,
  type RentalOpeningHours,
  type UpdateExcursionOperatorBody,
  type UpdateExcursionProductBody,
  trimToPublicSummary,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublicationAlertsService } from '../notifications/event-publication-alerts.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { normalizeRentalProductImages } from '../rental-locations/rental-product-images.util';
import { readEntitySocialLinks, writeEntitySocialLinks } from '../../common/entity-social-links.util';
import {
  readExcursionSchedulePublic,
  writeExcursionScheduleFields,
} from '../../common/excursion-schedule.util';
import { normalizeRelatedLinksForWrite } from '../../common/related-links.util';
import {
  resolveValidatedExcursionSubcategories,
  syncEventSubcategories,
} from '../../common/event-subcategories.util';
import {
  syncEventTags,
  validateEventTagIds,
} from '../../common/event-tags.util';

@Injectable()
export class ExcursionOperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategories: SubcategoriesService,
    private readonly publicationAlerts: EventPublicationAlertsService,
  ) {}

  private normalizeSummary(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    return trimToPublicSummary(value);
  }

  private toPrismaEventStatus(status?: string): EventStatus {
    const key = (status ?? 'approved').toLowerCase();
    const map: Record<string, EventStatus> = {
      draft: 'DRAFT',
      pending: 'PENDING',
      approved: 'APPROVED',
      paused: 'PAUSED',
      cancelled: 'CANCELLED',
    };
    return map[key] ?? 'APPROVED';
  }

  private readOpeningHours(row: ExcursionOperator): RentalOpeningHours | null {
    return parseRentalOpeningHours(row.openingHours);
  }

  private writeOpeningHours(
    value: RentalOpeningHours | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value == null) return Prisma.JsonNull;
    return rentalOpeningHoursSchema.parse(value) as Prisma.InputJsonValue;
  }

  private toSummary(
    row: ExcursionOperator & { _count?: { excursions: number } },
  ): ExcursionOperatorSummary {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      address: row.address,
      city: row.city,
      province: row.province,
      googlePlaceId: row.googlePlaceId,
      openingHours: this.readOpeningHours(row),
      openingHoursNote: row.openingHoursNote,
      contactPhone: row.contactPhone,
      websiteUrl: row.websiteUrl,
      bookingUrl: row.bookingUrl,
      socialLinks: readEntitySocialLinks(row.socialLinks),
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      excursionCount: row._count?.excursions,
    };
  }

  private eventToSummary(event: Event) {
    return {
      id: event.id,
      title: event.title,
      startAt: event.startAt.toISOString(),
      city: event.city,
      venueName: event.venueName,
      coverImageUrl: event.coverImageUrl,
      category: event.category,
      subcategoryId: event.subcategoryId,
      description: event.description,
      summary: event.summary,
      status: event.status,
    };
  }

  async listAdmin(
    tenantId: string,
    query: AdminExcursionOperatorsListQuery,
  ): Promise<{ data: ExcursionOperatorSummary[] }> {
    const effectiveTenant = query.tenantId ?? tenantId;
    const rows = await this.prisma.excursionOperator.findMany({
      where: {
        tenantId: effectiveTenant,
        deletedAt: null,
        ...(query.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            excursions: {
              where: { deletedAt: null, category: 'excursion' },
            },
          },
        },
      },
    });
    return { data: rows.map((r) => this.toSummary(r)) };
  }

  async getAdmin(tenantId: string, id: string): Promise<ExcursionOperatorDetail> {
    const row = await this.prisma.excursionOperator.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        excursions: {
          where: { deletedAt: null, category: 'excursion' },
          orderBy: { title: 'asc' },
        },
        _count: {
          select: {
            excursions: {
              where: { deletedAt: null, category: 'excursion' },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion operator not found',
      });
    }
    return {
      ...this.toSummary(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      excursions: row.excursions.map((p) => this.eventToSummary(p)),
    };
  }

  async create(tenantId: string, body: CreateExcursionOperatorBody) {
    const effectiveTenant = body.tenantId ?? tenantId;
    const row = await this.prisma.excursionOperator.create({
      data: {
        tenantId: effectiveTenant,
        name: body.name.trim(),
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        province: body.province?.trim() || null,
        googlePlaceId: body.googlePlaceId?.trim() || null,
        openingHours: this.writeOpeningHours(body.openingHours ?? null),
        openingHoursNote: body.openingHoursNote?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        websiteUrl: body.websiteUrl ?? null,
        bookingUrl: body.bookingUrl ?? null,
        socialLinks: writeEntitySocialLinks(body.socialLinks),
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return this.toSummary(row);
  }

  async update(tenantId: string, id: string, body: UpdateExcursionOperatorBody) {
    await this.assertOperator(tenantId, id);
    const row = await this.prisma.excursionOperator.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && {
          address: body.address?.trim() || null,
        }),
        ...(body.city !== undefined && { city: body.city?.trim() || null }),
        ...(body.province !== undefined && {
          province: body.province?.trim() || null,
        }),
        ...(body.googlePlaceId !== undefined && {
          googlePlaceId: body.googlePlaceId?.trim() || null,
        }),
        ...(body.openingHours !== undefined && {
          openingHours: this.writeOpeningHours(body.openingHours),
        }),
        ...(body.openingHoursNote !== undefined && {
          openingHoursNote: body.openingHoursNote?.trim() || null,
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone?.trim() || null,
        }),
        ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl }),
        ...(body.bookingUrl !== undefined && { bookingUrl: body.bookingUrl }),
        ...(body.socialLinks !== undefined && {
          socialLinks: writeEntitySocialLinks(body.socialLinks),
        }),
        ...(body.geoLat !== undefined && { geoLat: body.geoLat ?? null }),
        ...(body.geoLng !== undefined && { geoLng: body.geoLng ?? null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    return this.toSummary(row);
  }

  async remove(tenantId: string, id: string) {
    await this.assertOperator(tenantId, id);
    await this.prisma.excursionOperator.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { ok: true as const };
  }

  async createExcursion(
    tenantId: string,
    operatorId: string,
    producerId: string,
    body: CreateExcursionProductBody,
  ) {
    const operator = await this.assertOperator(tenantId, operatorId);
    const subcategoryResolved = await resolveValidatedExcursionSubcategories(
      this.prisma,
      tenantId,
      {
        ...(body.subcategoryId !== undefined ? { subcategoryId: body.subcategoryId } : {}),
        ...(body.subcategoryIds !== undefined ? { subcategoryIds: body.subcategoryIds } : {}),
      },
    );
    const subcategoryId = subcategoryResolved?.primaryId ?? null;
    const tagIds = await validateEventTagIds(
      this.prisma,
      tenantId,
      'excursion',
      body.tagIds,
    );
    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);
    const now = new Date();
    const hasLocationOverride =
      body.venueAddress !== undefined ||
      body.city !== undefined ||
      body.province !== undefined ||
      body.googlePlaceId !== undefined ||
      body.geoLat !== undefined ||
      body.geoLng !== undefined;
    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          tenantId,
          producerId,
          category: 'excursion',
          excursionOperatorId: operator.id,
          subcategoryId,
          title: body.title.trim(),
          summary: this.normalizeSummary(body.summary) ?? null,
          description: body.description?.trim() || null,
          startAt: now,
          endAt: null,
          city: hasLocationOverride ? (body.city?.trim() || null) : null,
          province: hasLocationOverride ? (body.province?.trim() || null) : null,
          venueName: operator.name,
          venueAddress: hasLocationOverride ? (body.venueAddress?.trim() || null) : null,
          googlePlaceId: hasLocationOverride ? (body.googlePlaceId?.trim() || null) : null,
          geoLat: hasLocationOverride ? (body.geoLat ?? null) : null,
          geoLng: hasLocationOverride ? (body.geoLng ?? null) : null,
          coverImageUrl: headerImageUrl ?? null,
          status: this.toPrismaEventStatus(body.status),
          ...writeExcursionScheduleFields(body),
          ...(body.relatedLinks !== undefined && {
            relatedLinks: normalizeRelatedLinksForWrite(body.relatedLinks) as Prisma.InputJsonValue,
          }),
          isTicketingEnabled: false,
          media: galleryMedia?.length
            ? {
                create: galleryMedia.map((m) => ({
                  type: m.type,
                  url: m.url,
                  sortOrder: m.sortOrder,
                })),
              }
            : undefined,
        },
        include: {
          media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (subcategoryResolved) {
        await syncEventSubcategories(
          tx,
          created.id,
          subcategoryResolved.primaryId,
          subcategoryResolved.allIds,
        );
      }
      await syncEventTags(tx, created.id, tagIds);
      return created;
    });
    if (event.status === 'APPROVED') {
      this.publicationAlerts.handleEventBecameApproved(tenantId, event.id);
    }
    return this.eventToSummary(event);
  }

  async updateExcursion(
    tenantId: string,
    operatorId: string,
    excursionId: string,
    body: UpdateExcursionProductBody,
  ) {
    await this.assertOperator(tenantId, operatorId);
    const existing = await this.prisma.event.findFirst({
      where: {
        id: excursionId,
        tenantId,
        excursionOperatorId: operatorId,
        category: 'excursion',
        deletedAt: null,
      },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion not found',
      });
    }

    let subcategoryId: string | null | undefined = undefined;
    let subcategoryResolved: Awaited<
      ReturnType<typeof resolveValidatedExcursionSubcategories>
    > = null;
    if (body.subcategoryId !== undefined || body.subcategoryIds !== undefined) {
      subcategoryResolved = await resolveValidatedExcursionSubcategories(
        this.prisma,
        tenantId,
        {
          subcategoryId: body.subcategoryId,
          subcategoryIds: body.subcategoryIds,
        },
      );
      subcategoryId = subcategoryResolved?.primaryId ?? null;
    }

    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);
    const hasLocationOverride =
      body.venueAddress !== undefined ||
      body.city !== undefined ||
      body.province !== undefined ||
      body.googlePlaceId !== undefined ||
      body.geoLat !== undefined ||
      body.geoLng !== undefined;

    let validatedTagIds: string[] | undefined;
    if (body.tagIds !== undefined) {
      validatedTagIds = await validateEventTagIds(
        this.prisma,
        tenantId,
        'excursion',
        body.tagIds ?? [],
      );
    }

    const previousStatus = existing.status;
    const event = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id: excursionId },
        data: {
          ...(body.title !== undefined && { title: body.title.trim() }),
          ...(body.summary !== undefined && {
            summary: this.normalizeSummary(body.summary) ?? null,
          }),
          ...(body.description !== undefined && {
            description: body.description?.trim() || null,
          }),
          ...(headerImageUrl !== undefined && { coverImageUrl: headerImageUrl }),
          ...(body.status !== undefined && {
            status: this.toPrismaEventStatus(body.status),
          }),
          ...(subcategoryId !== undefined && { subcategoryId }),
          ...writeExcursionScheduleFields(body),
          ...(body.relatedLinks !== undefined && {
            relatedLinks:
              normalizeRelatedLinksForWrite(body.relatedLinks) ?? Prisma.JsonNull,
          }),
          ...(hasLocationOverride && {
            city: body.city?.trim() || null,
            province: body.province?.trim() || null,
            venueAddress: body.venueAddress?.trim() || null,
            googlePlaceId: body.googlePlaceId?.trim() || null,
            geoLat: body.geoLat ?? null,
            geoLng: body.geoLng ?? null,
          }),
        },
      });
      if (subcategoryResolved) {
        await syncEventSubcategories(
          tx,
          excursionId,
          subcategoryResolved.primaryId,
          subcategoryResolved.allIds,
        );
      }
      if (validatedTagIds !== undefined) {
        await syncEventTags(tx, excursionId, validatedTagIds);
      }
      return updated;
    });

    if (event.status === 'APPROVED') {
      this.publicationAlerts.handleEventBecameApproved(tenantId, event.id, previousStatus);
    }

    if (galleryMedia !== undefined) {
      await this.prisma.eventMedia.updateMany({
        where: { eventId: excursionId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (galleryMedia.length > 0) {
        await this.prisma.eventMedia.createMany({
          data: galleryMedia.map((m) => ({
            eventId: excursionId,
            type: m.type,
            url: m.url,
            sortOrder: m.sortOrder,
          })),
        });
      }
    }

    return this.eventToSummary(event);
  }

  async resolveExcursionOperatorForEvent(
    tenantId: string,
    category: string,
    excursionOperatorId: string | null | undefined,
  ): Promise<string | null> {
    if (!excursionOperatorId) return null;
    if (category !== 'excursion') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'excursionOperatorId is only valid for excursion category',
      });
    }
    const operator = await this.prisma.excursionOperator.findFirst({
      where: {
        id: excursionOperatorId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (!operator) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid excursion operator',
      });
    }
    return operator.id;
  }

  async assertOperator(tenantId: string, id: string) {
    const row = await this.prisma.excursionOperator.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion operator not found',
      });
    }
    return row;
  }
}
