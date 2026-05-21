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
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublicationAlertsService } from '../notifications/event-publication-alerts.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { normalizeRentalProductImages } from '../rental-locations/rental-product-images.util';

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
    if (value == null) return null;
    const t = value.trim();
    return t === '' ? null : t.slice(0, 220);
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
      openingHours: this.readOpeningHours(row),
      openingHoursNote: row.openingHoursNote,
      contactPhone: row.contactPhone,
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
        openingHours: this.writeOpeningHours(body.openingHours ?? null),
        openingHoursNote: body.openingHoursNote?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
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
        ...(body.openingHours !== undefined && {
          openingHours: this.writeOpeningHours(body.openingHours),
        }),
        ...(body.openingHoursNote !== undefined && {
          openingHoursNote: body.openingHoursNote?.trim() || null,
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone?.trim() || null,
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
    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      tenantId,
      'excursion',
      body.subcategoryId ?? null,
    );
    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);
    const now = new Date();
    const event = await this.prisma.event.create({
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
        city: operator.city,
        venueName: operator.name,
        venueAddress: operator.address,
        geoLat: operator.geoLat,
        geoLng: operator.geoLng,
        coverImageUrl: headerImageUrl ?? null,
        status: this.toPrismaEventStatus(body.status),
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
    if (body.subcategoryId !== undefined) {
      subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        'excursion',
        body.subcategoryId,
      );
    }

    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);

    const previousStatus = existing.status;
    const event = await this.prisma.event.update({
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
      },
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
