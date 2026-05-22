import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import type {
  EventCreateDto,
  EventUpdateDto,
  EventDetail,
  EventSummary,
  EventsPaginatedResponse,
} from '@yo-te-invito/shared';
import { deriveProducerEventMode } from '@yo-te-invito/shared';
import { ErrorCode, parseRentalOpeningHours } from '@yo-te-invito/shared';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { RentalLocationsService } from '../rental-locations/rental-locations.service';

@Injectable()
export class ProducerEventsCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesAuth: ProfilesAuthorizationService,
    private readonly subcategories: SubcategoriesService,
    private readonly rentalLocations: RentalLocationsService,
  ) {}

  private async assertEventOwnedByUser(
    eventId: string,
    tenantId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, producerId: true, producerProfileId: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === 'ADMIN';
    const canManage =
      isAdmin ||
      (await this.profilesAuth.canManageEvent(tenantId, userId, event));
    if (!canManage) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not allowed to modify this event',
      });
    }
    return event;
  }

  private mapRentalLocationForDetail(
    loc: {
      id: string;
      name: string;
      address: string | null;
      openingHours: unknown;
      openingHoursNote: string | null;
      whatsappPhone: string | null;
      geoLat: number | null;
      geoLng: number | null;
    } | null,
  ): EventDetail['rentalLocation'] {
    if (!loc) return undefined;
    return {
      id: loc.id,
      name: loc.name,
      address: loc.address,
      openingHours: parseRentalOpeningHours(loc.openingHours),
      openingHoursNote: loc.openingHoursNote,
      whatsappPhone: loc.whatsappPhone,
      geoLat: loc.geoLat,
      geoLng: loc.geoLng,
    };
  }

  private toEventDetail(event: {
    id: string;
    title: string;
    startAt: Date;
    city: string | null;
    venueName: string | null;
    coverImageUrl: string | null;
    category: string | null;
    subcategoryId: string | null;
    rentalLocationId?: string | null;
    rentalLocation?: {
      id: string;
      name: string;
      address: string | null;
      openingHours: unknown;
      openingHoursNote: string | null;
      whatsappPhone: string | null;
      geoLat: number | null;
      geoLng: number | null;
    } | null;
    description: string | null;
    summary?: string | null;
    endAt: Date | null;
    venueAddress: string | null;
    geoLat: number | null;
    geoLng: number | null;
    capacityTotal: number | null;
    isTicketingEnabled: boolean;
    isGeneralPublication: boolean;
    status: string;
    ratingAvg: number | null;
    ratingCount: number;
    media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
  }): EventDetail {
    return {
      id: event.id,
      title: event.title,
      startAt: event.startAt.toISOString(),
      city: event.city,
      venueName: event.venueName,
      coverImageUrl: event.coverImageUrl,
      category: event.category ?? undefined,
      subcategoryId: event.subcategoryId ?? undefined,
      description: event.description,
      summary: event.summary ?? null,
      endAt: event.endAt?.toISOString() ?? null,
      venueAddress: event.venueAddress,
      geoLat: event.geoLat,
      geoLng: event.geoLng,
      capacityTotal: event.capacityTotal,
      isTicketingEnabled: event.isTicketingEnabled,
      isGeneralPublication: event.isGeneralPublication,
      eventMode: deriveProducerEventMode(event.isGeneralPublication),
      status: event.status,
      ratingAvg: event.ratingAvg ?? undefined,
      ratingCount: event.ratingCount,
      media: event.media.map((m) => ({
        id: m.id,
        type: m.type as 'IMAGE' | 'VIDEO',
        url: m.url,
        sortOrder: m.sortOrder,
      })),
      rentalLocation: this.mapRentalLocationForDetail(event.rentalLocation ?? null),
    };
  }

  async getDetail(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<EventDetail> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        rentalLocation: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return this.toEventDetail({
      ...event,
      media: event.media,
      rentalLocation: event.rentalLocation,
    });
  }

  async list(
    tenantId: string,
    producerId: string,
    userId: string,
    userRole: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<EventsPaginatedResponse> {
    const where: {
      tenantId: string;
      deletedAt: null;
      producerId?: string;
      producerProfileId?: { in: string[] };
      OR?: Array<{ producerId: string } | { producerProfileId: { in: string[] } }>;
      status?: EventStatus;
    } = {
      tenantId,
      deletedAt: null,
    };
    if (userRole !== 'ADMIN') {
      const profileId = await this.profilesAuth.getDefaultProducerProfileId(
        tenantId,
        userId,
      );
      if (profileId) {
        where.OR = [
          { producerId },
          { producerProfileId: { in: [profileId] } },
        ];
      } else {
        where.producerId = producerId;
      }
    }
    const validStatuses: EventStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED'];
    if (status && validStatuses.includes(status.toUpperCase() as EventStatus)) {
      where.status = status.toUpperCase() as EventStatus;
    }
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          city: true,
          venueName: true,
          coverImageUrl: true,
          category: true,
          isTicketingEnabled: true,
          isGeneralPublication: true,
          status: true,
          createdAt: true,
        },
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    const items: EventSummary[] = data.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      city: e.city,
      venueName: e.venueName,
      coverImageUrl: e.coverImageUrl,
      category: e.category,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      isTicketingEnabled: e.isTicketingEnabled,
      isGeneralPublication: e.isGeneralPublication,
      eventMode: deriveProducerEventMode(e.isGeneralPublication),
    }));
    return {
      data: items,
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
    body: EventCreateDto,
  ): Promise<EventDetail> {
    const producerProfileId = await this.profilesAuth.getDefaultProducerProfileId(
      tenantId,
      producerId,
    );
    const category = body.category?.trim() || 'event';
    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      tenantId,
      category,
      body.subcategoryId ?? null,
    );
    const rentalLocationId = await this.rentalLocations.resolveRentalLocationForEvent(
      tenantId,
      category,
      body.rentalLocationId ?? null,
    );
    const isPublicityOnly = body.eventMode === 'PUBLICITY_ONLY';

    const event = await this.prisma.event.create({
      data: {
        tenantId,
        producerId,
        producerProfileId: producerProfileId ?? undefined,
        category,
        subcategoryId,
        rentalLocationId,
        title: body.title,
        description: body.description ?? null,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        city: body.city ?? null,
        venueName: body.venueName ?? null,
        venueAddress: body.venueAddress ?? null,
        capacityTotal: body.capacityTotal ?? null,
        coverImageUrl: body.coverImageUrl ?? null,
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        status: 'DRAFT',
        isTicketingEnabled: false,
        isGeneralPublication: isPublicityOnly,
      },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        rentalLocation: true,
      },
    });

    return this.toEventDetail({
      ...event,
      media: event.media,
      rentalLocation: event.rentalLocation,
    });
  }

  async update(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    body: EventUpdateDto,
  ): Promise<EventDetail> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);

    const existing = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const nextCategory =
      body.category !== undefined ? body.category?.trim() || 'event' : existing.category;
    let subcategoryId: string | null | undefined = undefined;
    if (body.subcategoryId !== undefined) {
      subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        nextCategory,
        body.subcategoryId,
      );
    } else if (body.category !== undefined && existing.subcategoryId) {
      subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        nextCategory,
        existing.subcategoryId,
      );
    }

    let rentalLocationId: string | null | undefined = undefined;
    if (body.rentalLocationId !== undefined) {
      rentalLocationId = await this.rentalLocations.resolveRentalLocationForEvent(
        tenantId,
        nextCategory ?? 'event',
        body.rentalLocationId,
      );
    }

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.summary !== undefined && {
          summary:
            body.summary == null || body.summary.trim() === ''
              ? null
              : body.summary.trim().slice(0, 220),
        }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt) : null,
        }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.venueName !== undefined && { venueName: body.venueName }),
        ...(body.venueAddress !== undefined && {
          venueAddress: body.venueAddress,
        }),
        ...(body.capacityTotal !== undefined && {
          capacityTotal: body.capacityTotal,
        }),
        ...(body.coverImageUrl !== undefined && {
          coverImageUrl: body.coverImageUrl,
        }),
        ...(body.geoLat !== undefined && { geoLat: body.geoLat }),
        ...(body.geoLng !== undefined && { geoLng: body.geoLng }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.category !== undefined && { category: nextCategory }),
        ...(subcategoryId !== undefined && { subcategoryId }),
        ...(rentalLocationId !== undefined && { rentalLocationId }),
      },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        rentalLocation: true,
      },
    });

    return this.toEventDetail({
      ...event,
      media: event.media,
      rentalLocation: event.rentalLocation,
    });
  }
}
