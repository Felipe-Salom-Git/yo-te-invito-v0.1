import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Event, type EventStatus, type RentalLocation } from '@prisma/client';
import {
  ErrorCode,
  parseRentalOpeningHours,
  rentalOpeningHoursSchema,
  type AdminRentalLocationsListQuery,
  type CreateRentalLocationBody,
  type CreateRentalProductBody,
  type RentalLocationDetail,
  type RentalLocationSummary,
  type RentalOpeningHours,
  type UpdateRentalLocationBody,
  type UpdateRentalProductBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { normalizeRentalProductImages } from './rental-product-images.util';

@Injectable()
export class RentalLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategories: SubcategoriesService,
  ) {}

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

  private readOpeningHours(row: RentalLocation): RentalOpeningHours | null {
    return parseRentalOpeningHours(row.openingHours);
  }

  private writeOpeningHours(
    value: RentalOpeningHours | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value == null) return Prisma.JsonNull;
    return rentalOpeningHoursSchema.parse(value) as Prisma.InputJsonValue;
  }

  private toSummary(
    row: RentalLocation & { _count?: { products: number } },
  ): RentalLocationSummary {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      address: row.address,
      openingHours: this.readOpeningHours(row),
      openingHoursNote: row.openingHoursNote,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      productCount: row._count?.products,
    };
  }

  private toPublicLocation(row: RentalLocation) {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      openingHours: this.readOpeningHours(row),
      openingHoursNote: row.openingHoursNote,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
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
    };
  }

  async listAdmin(
    tenantId: string,
    query: AdminRentalLocationsListQuery,
  ): Promise<{ data: RentalLocationSummary[] }> {
    const effectiveTenant = query.tenantId ?? tenantId;
    const rows = await this.prisma.rentalLocation.findMany({
      where: {
        tenantId: effectiveTenant,
        deletedAt: null,
        ...(query.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null, category: 'rental' },
            },
          },
        },
      },
    });
    return { data: rows.map((r) => this.toSummary(r)) };
  }

  async getAdmin(tenantId: string, id: string): Promise<RentalLocationDetail> {
    const row = await this.prisma.rentalLocation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        products: {
          where: { deletedAt: null, category: 'rental' },
          orderBy: { title: 'asc' },
        },
        _count: {
          select: {
            products: {
              where: { deletedAt: null, category: 'rental' },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental location not found',
      });
    }
    return {
      ...this.toSummary(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      products: row.products.map((p) => this.eventToSummary(p)),
    };
  }

  async create(tenantId: string, body: CreateRentalLocationBody) {
    const effectiveTenant = body.tenantId ?? tenantId;
    const row = await this.prisma.rentalLocation.create({
      data: {
        tenantId: effectiveTenant,
        name: body.name.trim(),
        address: body.address?.trim() || null,
        openingHours: this.writeOpeningHours(body.openingHours ?? null),
        openingHoursNote: body.openingHoursNote?.trim() || null,
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return this.toSummary(row);
  }

  async update(tenantId: string, id: string, body: UpdateRentalLocationBody) {
    await this.assertLocation(tenantId, id);
    const row = await this.prisma.rentalLocation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && {
          address: body.address?.trim() || null,
        }),
        ...(body.openingHours !== undefined && {
          openingHours: this.writeOpeningHours(body.openingHours),
        }),
        ...(body.openingHoursNote !== undefined && {
          openingHoursNote: body.openingHoursNote?.trim() || null,
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
    await this.assertLocation(tenantId, id);
    await this.prisma.rentalLocation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { ok: true as const };
  }

  async createProduct(
    tenantId: string,
    locationId: string,
    producerId: string,
    body: CreateRentalProductBody,
  ) {
    const location = await this.assertLocation(tenantId, locationId);
    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      tenantId,
      'rental',
      body.subcategoryId ?? null,
    );
    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);
    const now = new Date();
    const event = await this.prisma.event.create({
      data: {
        tenantId,
        producerId,
        category: 'rental',
        rentalLocationId: location.id,
        subcategoryId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        startAt: now,
        endAt: null,
        city: null,
        venueName: location.name,
        venueAddress: location.address,
        geoLat: location.geoLat,
        geoLng: location.geoLng,
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
    return this.eventToSummary(event);
  }

  async updateProduct(
    tenantId: string,
    locationId: string,
    productId: string,
    body: UpdateRentalProductBody,
  ) {
    await this.assertLocation(tenantId, locationId);
    const existing = await this.prisma.event.findFirst({
      where: {
        id: productId,
        tenantId,
        rentalLocationId: locationId,
        category: 'rental',
        deletedAt: null,
      },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental product not found',
      });
    }

    let subcategoryId: string | null | undefined = undefined;
    if (body.subcategoryId !== undefined) {
      subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        'rental',
        body.subcategoryId,
      );
    }

    const { headerImageUrl, galleryMedia } = normalizeRentalProductImages(body);

    const event = await this.prisma.event.update({
      where: { id: productId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
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

    if (galleryMedia !== undefined) {
      await this.prisma.eventMedia.updateMany({
        where: { eventId: productId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (galleryMedia.length > 0) {
        await this.prisma.eventMedia.createMany({
          data: galleryMedia.map((m) => ({
            eventId: productId,
            type: m.type,
            url: m.url,
            sortOrder: m.sortOrder,
          })),
        });
      }
    }

    return this.eventToSummary(event);
  }

  async resolveRentalLocationForEvent(
    tenantId: string,
    category: string,
    rentalLocationId: string | null | undefined,
  ): Promise<string | null> {
    if (!rentalLocationId) return null;
    if (category !== 'rental') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'rentalLocationId is only valid for rental category',
      });
    }
    const location = await this.prisma.rentalLocation.findFirst({
      where: {
        id: rentalLocationId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });
    if (!location) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid rental location',
      });
    }
    return location.id;
  }

  async assertLocation(tenantId: string, id: string) {
    const row = await this.prisma.rentalLocation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental location not found',
      });
    }
    return row;
  }

  async getPublicDetail(tenantId: string, id: string) {
    const row = await this.prisma.rentalLocation.findFirst({
      where: { id, tenantId, deletedAt: null, isActive: true },
      include: {
        products: {
          where: {
            deletedAt: null,
            category: 'rental',
            status: 'APPROVED',
          },
          orderBy: { title: 'asc' },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental location not found',
      });
    }
    return {
      location: this.toPublicLocation(row),
      products: row.products.map((p) => this.eventToSummary(p)),
    };
  }
}
