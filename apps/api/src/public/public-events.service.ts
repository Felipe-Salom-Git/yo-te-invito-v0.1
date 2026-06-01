import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  EventsListQuery,
  EventsPaginatedResponse,
  EventSummary,
  EventDetail,
  EventsSearchQuery,
  EventsTrendingQuery,
  EventsCalendarMonthQuery,
  PublicGastroDiscountsResponse,
} from '@yo-te-invito/shared';
import {
  ErrorCode,
  RECOMMENDED_LIST_MIN_VALID_REVIEWS,
  parseRentalOpeningHours,
  type EventsRecommendedQuery,
} from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../common/utils/event-public-visibility.util';
import { TRENDING_PRISMA_ORDER_BY } from '../common/utils/event-trending.util';
import {
  loadPublicFromPriceByEventId,
  resolvePublicProducerName,
  type PublicFromPriceCandidate,
} from '../common/utils/public-event-summary.util';

@Injectable()
export class PublicEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private publicWhere(base: Prisma.EventWhereInput): Prisma.EventWhereInput {
    return mergePublicEventVisibility(base);
  }

  private listOrderBy(
    sort: EventsListQuery['sort'],
  ): Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] {
    switch (sort) {
      case 'recent':
        return { createdAt: 'desc' };
      case 'featured_rating':
        return [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { startAt: 'asc' }];
      case 'recommended':
        return [
          { rankingScore: 'desc' },
          { ratingCount: 'desc' },
          { ratingAvg: 'desc' },
          { startAt: 'asc' },
        ];
      case 'top_rated':
        return [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { startAt: 'asc' }];
      case 'featured_event':
        return [
          { isTicketingEnabled: 'desc' },
          { ratingAvg: 'desc' },
          { ratingCount: 'desc' },
          { startAt: 'asc' },
        ];
      case 'dateAsc':
      case 'upcoming':
      default:
        return { startAt: 'asc' };
    }
  }

  private applyPublicListFilters(base: Prisma.EventWhereInput, query: EventsListQuery): void {
    if (query.excludeGeneralPublications === true) {
      base.isGeneralPublication = false;
    }
    if (query.hasTicketing === true) {
      base.isTicketingEnabled = true;
      base.isGeneralPublication = false;
      base.ticketTypes = { some: { deletedAt: null, status: 'ACTIVE' } };
    } else if (query.hasTicketing === false) {
      base.OR = [
        { isTicketingEnabled: false },
        { isGeneralPublication: true },
        { ticketTypes: { none: { deletedAt: null, status: 'ACTIVE' } } },
      ];
    }
  }

  private mapHasTicketing(row: {
    isTicketingEnabled: boolean;
    isGeneralPublication: boolean;
    ticketTypes: Array<{ id: string }>;
  }): boolean {
    return (
      row.isTicketingEnabled &&
      !row.isGeneralPublication &&
      row.ticketTypes.length > 0
    );
  }

  private listSummarySelect() {
    return {
      id: true,
      title: true,
      startAt: true,
      city: true,
      venueName: true,
      coverImageUrl: true,
      category: true,
      subcategoryId: true,
      description: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      isTicketingEnabled: true,
      isGeneralPublication: true,
      subcategory: { select: { name: true } },
      producerProfile: {
        where: { status: 'ACTIVE' },
        select: { displayName: true },
      },
      ticketTypes: {
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
        take: 1,
      },
    } as const;
  }

  private async attachFromPriceToSummaries(
    items: EventSummary[],
    candidates: PublicFromPriceCandidate[],
  ): Promise<EventSummary[]> {
    const fromPriceMap = await loadPublicFromPriceByEventId(this.prisma, candidates);
    return items.map((item) => ({
      ...item,
      fromPrice: fromPriceMap.get(item.id) ?? null,
    }));
  }

  private applySubcategoryFilter(
    where: Prisma.EventWhereInput,
    query: { tenantId: string; category?: string; subcategoryId?: string; subcategorySlug?: string },
  ): void {
    const category = query.category?.trim();
    if (query.subcategoryId?.trim()) {
      const id = query.subcategoryId.trim();
      if (category) {
        where.subcategory = {
          id,
          category,
          tenantId: query.tenantId,
          isActive: true,
        };
      } else {
        where.subcategoryId = id;
      }
      return;
    }
    if (query.subcategorySlug?.trim() && category) {
      where.subcategory = {
        slug: query.subcategorySlug.trim(),
        category,
        tenantId: query.tenantId,
        isActive: true,
      };
    }
  }

  private searchOrderBy(
    category?: string,
  ): Prisma.EventOrderByWithRelationInput | Prisma.EventOrderByWithRelationInput[] {
    const c = category?.trim();
    if (c && c !== 'event') {
      return { createdAt: 'desc' };
    }
    return { startAt: 'asc' };
  }

  private applyCategoryFilter(base: Prisma.EventWhereInput, category?: string): void {
    const c = category?.trim();
    if (c === 'event') {
      base.OR = [{ category: 'event' }, { category: null }];
    } else if (c) {
      base.category = c;
    }
  }

  async list(query: EventsListQuery): Promise<EventsPaginatedResponse> {
    const base: Prisma.EventWhereInput = {
      tenantId: query.tenantId,
      status: 'APPROVED',
      deletedAt: null,
    };

    if (query.city) {
      base.city = query.city;
    }

    this.applyCategoryFilter(base, query.category);
    this.applySubcategoryFilter(base, query);
    this.applyPublicListFilters(base, query);

    if (query.dateFrom || query.dateTo) {
      base.startAt = {};
      if (query.dateFrom) {
        base.startAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        base.startAt.lte = new Date(query.dateTo);
      }
    }

    const where = this.publicWhere(base);

    const minReviews =
      query.minValidReviews ??
      (query.sort === 'recommended' || query.sort === 'top_rated'
        ? RECOMMENDED_LIST_MIN_VALID_REVIEWS
        : 0);
    if (minReviews > 0) {
      where.ratingCount = { gte: minReviews };
    }

    const now = new Date();
    const gastroList = (query.category ?? '').toLowerCase() === 'gastro';
    const orderBy = this.listOrderBy(query.sort);
    const summarySelect = this.listSummarySelect();

    const [data, total] = await Promise.all([
      gastroList
        ? this.prisma.event.findMany({
            where,
            include: {
              gastroDiscounts: {
                where: {
                  status: 'ACTIVE',
                  AND: [
                    { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                    { OR: [{ validTo: null }, { validTo: { gte: now } }] },
                  ],
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              producerProfile: {
                where: { status: 'ACTIVE' },
                select: { displayName: true },
              },
            },
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          })
        : this.prisma.event.findMany({
            where,
            select: summarySelect,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          }),
      this.prisma.event.count({ where }),
    ]);

    const priceCandidates: PublicFromPriceCandidate[] = [];
    const itemsBase: EventSummary[] = gastroList
      ? (
          data as Array<{
            id: string;
            title: string;
            startAt: Date;
            city: string | null;
            venueName: string | null;
            coverImageUrl: string | null;
            category: string | null;
            description: string | null;
            ratingAvg: number | null;
            ratingCount: number;
            createdAt: Date;
            isTicketingEnabled: boolean;
            isGeneralPublication: boolean;
            subcategoryId: string | null;
            producerProfile: { displayName: string } | null;
            gastroDiscounts: Array<{
              code: string;
              type: string;
              value: number;
              displayTitle: string | null;
              displayImageUrls: unknown;
            }>;
          }>
        ).map((e) => {
          priceCandidates.push({
            id: e.id,
            isTicketingEnabled: e.isTicketingEnabled,
            isGeneralPublication: e.isGeneralPublication,
          });
          const d = e.gastroDiscounts[0];
          const promoLabel =
            d &&
            (d.displayTitle?.trim() ||
              `${d.type === 'PERCENT' ? `${d.value}%` : `$${d.value}`} · ${d.code}`);
          let promoImg: string | null | undefined;
          if (d?.displayImageUrls != null && Array.isArray(d.displayImageUrls)) {
            const first = d.displayImageUrls[0];
            promoImg = typeof first === 'string' ? first : null;
          }
          return {
            id: e.id,
            title: e.title,
            startAt: e.startAt.toISOString(),
            city: e.city,
            venueName: e.venueName,
            coverImageUrl: e.coverImageUrl,
            category: e.category ?? undefined,
            description: e.description ?? undefined,
            ratingAvg: e.ratingAvg ?? undefined,
            ratingCount: e.ratingCount ?? undefined,
            createdAt: e.createdAt.toISOString(),
            isTicketingEnabled: e.isTicketingEnabled,
            isGeneralPublication: e.isGeneralPublication,
            subcategoryId: e.subcategoryId ?? undefined,
            gastroPromoLabel: promoLabel ?? null,
            gastroPromoImageUrl: promoImg ?? null,
            producerName: resolvePublicProducerName(e.producerProfile),
            fromPrice: null,
          };
        })
      : (
          data as Array<{
            id: string;
            title: string;
            startAt: Date;
            city: string | null;
            venueName: string | null;
            coverImageUrl: string | null;
            category: string | null;
            subcategoryId: string | null;
            description: string | null;
            ratingAvg: number | null;
            ratingCount: number;
            createdAt: Date;
            isTicketingEnabled: boolean;
            isGeneralPublication: boolean;
            subcategory: { name: string } | null;
            producerProfile: { displayName: string } | null;
            ticketTypes: Array<{ id: string }>;
          }>
        ).map((e) => {
          priceCandidates.push({
            id: e.id,
            isTicketingEnabled: e.isTicketingEnabled,
            isGeneralPublication: e.isGeneralPublication,
          });
          return {
            id: e.id,
            title: e.title,
            startAt: e.startAt.toISOString(),
            city: e.city,
            venueName: e.venueName,
            coverImageUrl: e.coverImageUrl,
            category: e.category ?? undefined,
            subcategoryId: e.subcategoryId ?? undefined,
            subcategoryName: e.subcategory?.name ?? null,
            description: e.description ?? undefined,
            ratingAvg: e.ratingAvg ?? undefined,
            ratingCount: e.ratingCount ?? undefined,
            createdAt: e.createdAt.toISOString(),
            isTicketingEnabled: e.isTicketingEnabled,
            isGeneralPublication: e.isGeneralPublication,
            hasTicketing: this.mapHasTicketing(e),
            producerName: resolvePublicProducerName(e.producerProfile),
            fromPrice: null,
          };
        });

    const items = await this.attachFromPriceToSummaries(itemsBase, priceCandidates);

    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async listCalendarMonth(query: EventsCalendarMonthQuery): Promise<EventSummary[]> {
    const [year, month] = query.month.split('-').map(Number);
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59, 999);

    const listQuery: EventsListQuery = {
      tenantId: query.tenantId,
      page: 1,
      limit: 200,
      category: query.category?.trim() || 'event',
      subcategoryId: query.subcategoryId,
      subcategorySlug: query.subcategorySlug,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      sort: 'dateAsc',
    };

    const result = await this.list(listQuery);
    return result.data;
  }

  async search(query: EventsSearchQuery): Promise<EventsPaginatedResponse> {
    const base: Prisma.EventWhereInput = {
      tenantId: query.tenantId,
      status: 'APPROVED',
      deletedAt: null,
    };

    if (query.q?.trim()) {
      base.title = { contains: query.q.trim(), mode: 'insensitive' };
    }

    if (query.city?.trim()) {
      base.city = query.city.trim();
    }

    this.applyCategoryFilter(base, query.category);
    this.applySubcategoryFilter(base, query);

    if (query.dateFrom || query.dateTo) {
      base.startAt = {};
      if (query.dateFrom) {
        base.startAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        base.startAt.lte = new Date(query.dateTo);
      }
    }

    if (query.minRating != null && query.minRating > 0) {
      base.ratingAvg = { gte: query.minRating };
    }

    const where = this.publicWhere(base);

    const summarySelect = this.listSummarySelect();
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: summarySelect,
        orderBy: this.searchOrderBy(query.category),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const priceCandidates: PublicFromPriceCandidate[] = [];
    const itemsBase: EventSummary[] = (
      data as Array<{
        id: string;
        title: string;
        startAt: Date;
        city: string | null;
        venueName: string | null;
        coverImageUrl: string | null;
        category: string | null;
        subcategoryId: string | null;
        description: string | null;
        ratingAvg: number | null;
        ratingCount: number;
        createdAt: Date;
        isTicketingEnabled: boolean;
        isGeneralPublication: boolean;
        subcategory: { name: string } | null;
        producerProfile: { displayName: string } | null;
        ticketTypes: Array<{ id: string }>;
      }>
    ).map((e) => {
      priceCandidates.push({
        id: e.id,
        isTicketingEnabled: e.isTicketingEnabled,
        isGeneralPublication: e.isGeneralPublication,
      });
      return {
        id: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        city: e.city,
        venueName: e.venueName,
        coverImageUrl: e.coverImageUrl,
        category: e.category ?? undefined,
        subcategoryId: e.subcategoryId ?? undefined,
        subcategoryName: e.subcategory?.name ?? null,
        description: e.description ?? undefined,
        ratingAvg: e.ratingAvg ?? undefined,
        ratingCount: e.ratingCount ?? undefined,
        createdAt: e.createdAt.toISOString(),
        isTicketingEnabled: e.isTicketingEnabled,
        isGeneralPublication: e.isGeneralPublication,
        hasTicketing: this.mapHasTicketing(e),
        producerName: resolvePublicProducerName(e.producerProfile),
        fromPrice: null,
      };
    });

    const items = await this.attachFromPriceToSummaries(itemsBase, priceCandidates);

    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async recommended(query: EventsRecommendedQuery): Promise<EventSummary[]> {
    const sort = query.mode === 'top_rated' ? 'top_rated' : 'recommended';
    const result = await this.list({
      tenantId: query.tenantId,
      category: query.category,
      subcategorySlug: query.subcategorySlug,
      sort,
      minValidReviews: query.minValidReviews,
      page: 1,
      limit: query.limit,
    });
    return result.data;
  }

  async trending(query: EventsTrendingQuery): Promise<EventSummary[]> {
    const summarySelect = {
      ...this.listSummarySelect(),
      viewCount: true,
      rankingScore: true,
    };
    const data = await this.prisma.event.findMany({
      where: this.publicWhere({
        tenantId: query.tenantId,
        status: 'APPROVED',
        deletedAt: null,
      }),
      select: summarySelect,
      orderBy: TRENDING_PRISMA_ORDER_BY,
      take: query.limit,
    });

    const priceCandidates: PublicFromPriceCandidate[] = [];
    const itemsBase: EventSummary[] = (
      data as Array<{
        id: string;
        title: string;
        startAt: Date;
        city: string | null;
        venueName: string | null;
        coverImageUrl: string | null;
        category: string | null;
        subcategoryId: string | null;
        description: string | null;
        ratingAvg: number | null;
        ratingCount: number;
        createdAt: Date;
        isTicketingEnabled: boolean;
        isGeneralPublication: boolean;
        subcategory: { name: string } | null;
        producerProfile: { displayName: string } | null;
        ticketTypes: Array<{ id: string }>;
      }>
    ).map((e) => {
      priceCandidates.push({
        id: e.id,
        isTicketingEnabled: e.isTicketingEnabled,
        isGeneralPublication: e.isGeneralPublication,
      });
      return {
        id: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        city: e.city,
        venueName: e.venueName,
        coverImageUrl: e.coverImageUrl,
        category: e.category ?? undefined,
        subcategoryId: e.subcategoryId ?? undefined,
        subcategoryName: e.subcategory?.name ?? null,
        description: e.description ?? undefined,
        ratingAvg: e.ratingAvg ?? undefined,
        ratingCount: e.ratingCount ?? undefined,
        createdAt: e.createdAt.toISOString(),
        isTicketingEnabled: e.isTicketingEnabled,
        isGeneralPublication: e.isGeneralPublication,
        hasTicketing: this.mapHasTicketing(e),
        producerName: resolvePublicProducerName(e.producerProfile),
        fromPrice: null,
      };
    });

    return this.attachFromPriceToSummaries(itemsBase, priceCandidates);
  }

  async listPublicGastroDiscounts(eventId: string, tenantId: string): Promise<PublicGastroDiscountsResponse> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        status: 'APPROVED',
        deletedAt: null,
      },
      select: { id: true, category: true },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    if ((event.category ?? '').toLowerCase() !== 'gastro') {
      return { discounts: [] };
    }

    const now = new Date();
    const rows = await this.prisma.gastroDiscount.findMany({
      where: {
        tenantId,
        eventId,
        status: 'ACTIVE',
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        validFrom: true,
        validTo: true,
        displayTitle: true,
        displayDescription: true,
        displayImageUrls: true,
      },
    });

    return {
      discounts: rows.map((r) => {
        const raw = r.displayImageUrls;
        const displayImageUrls =
          raw != null && Array.isArray(raw)
            ? raw.filter((x): x is string => typeof x === 'string')
            : undefined;
        return {
          id: r.id,
          code: r.code,
          type: r.type as 'PERCENT' | 'FIXED',
          value: r.value,
          validFrom: r.validFrom?.toISOString() ?? null,
          validTo: r.validTo?.toISOString() ?? null,
          displayTitle: r.displayTitle ?? null,
          displayDescription: r.displayDescription ?? null,
          displayImageUrls,
        };
      }),
    };
  }

  async detail(id: string, tenantId: string): Promise<EventDetail> {
    const event = await this.prisma.event.findFirst({
      where: this.publicWhere({
        id,
        tenantId,
        status: 'APPROVED',
        deletedAt: null,
      }),
      include: {
        media: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        rentalLocation: true,
        excursionOperator: true,
        producerProfile: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            slug: true,
            displayName: true,
            logoUrl: true,
            shortDescription: true,
            primaryEmail: true,
            primaryPhone: true,
            whatsapp: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const producerName = resolvePublicProducerName(event.producerProfile);
    const fromPriceMap = await loadPublicFromPriceByEventId(this.prisma, [
      {
        id: event.id,
        isTicketingEnabled: event.isTicketingEnabled,
        isGeneralPublication: event.isGeneralPublication,
      },
    ]);

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
      province: event.province ?? null,
      googlePlaceId: event.googlePlaceId ?? null,
      geoLat: event.geoLat,
      geoLng: event.geoLng,
      capacityTotal: event.capacityTotal,
      isTicketingEnabled: event.isTicketingEnabled,
      isGeneralPublication: event.isGeneralPublication,
      status: event.status,
      ratingAvg: event.ratingAvg,
      ratingCount: event.ratingCount,
      media: event.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        sortOrder: m.sortOrder,
      })),
      rentalLocation: event.rentalLocation
        ? {
            id: event.rentalLocation.id,
            name: event.rentalLocation.name,
            address: event.rentalLocation.address,
            city: event.rentalLocation.city,
            province: event.rentalLocation.province,
            googlePlaceId: event.rentalLocation.googlePlaceId,
            openingHours: parseRentalOpeningHours(event.rentalLocation.openingHours),
            openingHoursNote: event.rentalLocation.openingHoursNote,
            whatsappPhone: event.rentalLocation.whatsappPhone,
            geoLat: event.rentalLocation.geoLat,
            geoLng: event.rentalLocation.geoLng,
          }
        : null,
      excursionOperator: event.excursionOperator
        ? {
            id: event.excursionOperator.id,
            name: event.excursionOperator.name,
            address: event.excursionOperator.address,
            city: event.excursionOperator.city,
            province: event.excursionOperator.province,
            googlePlaceId: event.excursionOperator.googlePlaceId,
            openingHours: parseRentalOpeningHours(event.excursionOperator.openingHours),
            openingHoursNote: event.excursionOperator.openingHoursNote,
            contactPhone: event.excursionOperator.contactPhone,
            geoLat: event.excursionOperator.geoLat,
            geoLng: event.excursionOperator.geoLng,
          }
        : null,
      producer: event.producerProfile
        ? {
            id: event.producerProfile.id,
            slug: event.producerProfile.slug,
            displayName: event.producerProfile.displayName,
            logoUrl: event.producerProfile.logoUrl,
            shortDescription: event.producerProfile.shortDescription,
            primaryEmail: event.producerProfile.primaryEmail,
            primaryPhone: event.producerProfile.primaryPhone,
            whatsapp: event.producerProfile.whatsapp,
          }
        : null,
      producerName,
      fromPrice: fromPriceMap.get(event.id) ?? null,
    };
  }
}
