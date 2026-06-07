import { Injectable } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import type {
  CreateGeneralPublicationBody,
  EventsPaginatedResponse,
  EventSummary,
  GeneralPublicationsListQuery,
} from '@yo-te-invito/shared';
import { trimToPublicSummary } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublicationAlertsService } from '../notifications/event-publication-alerts.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { normalizeRentalProductImages } from '../rental-locations/rental-product-images.util';

@Injectable()
export class AdminGeneralPublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategories: SubcategoriesService,
    private readonly publicationAlerts: EventPublicationAlertsService,
  ) {}

  async list(
    tenantId: string,
    query: GeneralPublicationsListQuery,
  ): Promise<EventsPaginatedResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: Prisma.EventWhereInput = {
      tenantId,
      deletedAt: null,
      isGeneralPublication: true,
    };
    const validStatuses: EventStatus[] = [
      'DRAFT',
      'PENDING',
      'APPROVED',
      'PAUSED',
      'CANCELLED',
    ];
    if (
      query.status &&
      validStatuses.includes(query.status.toUpperCase() as EventStatus)
    ) {
      where.status = query.status.toUpperCase() as EventStatus;
    }
    if (query.category) {
      where.category = query.category;
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          startAt: true,
          city: true,
          venueName: true,
          coverImageUrl: true,
          status: true,
          category: true,
          subcategoryId: true,
          isTicketingEnabled: true,
          isGeneralPublication: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const items = data.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      city: e.city,
      venueName: e.venueName,
      coverImageUrl: e.coverImageUrl,
      status: e.status.toLowerCase(),
      category: e.category,
      subcategoryId: e.subcategoryId,
      isTicketingEnabled: e.isTicketingEnabled,
      isGeneralPublication: e.isGeneralPublication,
    }));

    return {
      data: items as EventSummary[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(
    tenantId: string,
    producerId: string,
    body: CreateGeneralPublicationBody,
  ) {
    const category = body.category;
    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      tenantId,
      category,
      body.subcategoryId ?? null,
    );
    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);
    const cover =
      headerImageUrl ?? body.coverImageUrl?.trim() ?? null;
    const summary =
      body.summary == null || body.summary === undefined
        ? null
        : body.summary.trim() === ''
          ? null
          : trimToPublicSummary(body.summary);

    const startAt = body.startAt ? new Date(body.startAt) : new Date();
    const status = body.status ?? 'APPROVED';

    const event = await this.prisma.event.create({
      data: {
        tenantId,
        producerId,
        category,
        subcategoryId,
        title: body.title.trim(),
        summary,
        description: body.description?.trim() || null,
        startAt,
        endAt: body.endAt ? new Date(body.endAt) : null,
        city: body.city?.trim() || null,
        venueName: body.venueName?.trim() || null,
        venueAddress: body.venueAddress?.trim() || null,
        province: body.province?.trim() || null,
        googlePlaceId: body.googlePlaceId?.trim() || null,
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        capacityTotal: body.capacityTotal ?? null,
        coverImageUrl: cover,
        status,
        isTicketingEnabled: false,
        isGeneralPublication: true,
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

    if (status === 'APPROVED') {
      this.publicationAlerts.handleEventBecameApproved(tenantId, event.id);
    }

    return {
      id: event.id,
      title: event.title,
      category: event.category,
      status: event.status.toLowerCase(),
    };
  }
}
