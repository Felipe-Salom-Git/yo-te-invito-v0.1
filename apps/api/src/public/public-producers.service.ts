import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapPublicProducerEvent,
  type PublicProducerDetail,
  type PublicProducerEventSummary,
  type ProducerReviewsSummary,
  type ProducerReviewListItem,
  type ProducerReviewsListQuery,
} from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../common/utils/event-public-visibility.util';

export interface ProducerSummary {
  id: string;
  tenantId: string;
  slug: string | null;
  displayName: string;
  shortDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  country: string | null;
  ratingAvg: number | null;
  ratingCount: number;
}

function parseGalleryUrls(raw: unknown): PublicProducerDetail['gallery'] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((url, index) => ({
      id: `gallery-${index}`,
      url,
      position: index,
    }));
}

function parseSocialLinks(raw: unknown): {
  websiteUrl: string | null;
  instagramUrl: string | null;
} {
  if (!raw || typeof raw !== 'object') {
    return { websiteUrl: null, instagramUrl: null };
  }
  const links = raw as Record<string, unknown>;
  const website =
    typeof links.website === 'string' && links.website.trim()
      ? links.website.trim()
      : null;
  const instagram =
    typeof links.instagram === 'string' && links.instagram.trim()
      ? links.instagram.trim()
      : null;
  return { websiteUrl: website, instagramUrl: instagram };
}

@Injectable()
export class PublicProducersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicList(
    page: number,
    limit: number,
    city?: string,
  ): Promise<{ producers: ProducerSummary[]; total: number }> {
    const whereClause: Prisma.ProducerProfileWhereInput = {
      status: 'ACTIVE',
    };
    if (city) {
      whereClause.city = { equals: city, mode: 'insensitive' };
    }

    const [producers, total] = await Promise.all([
      this.prisma.producerProfile.findMany({
        where: whereClause,
        select: {
          id: true,
          tenantId: true,
          slug: true,
          displayName: true,
          shortDescription: true,
          logoUrl: true,
          coverImageUrl: true,
          city: true,
          country: true,
          ratingAvg: true,
          ratingCount: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { ratingAvg: 'desc' },
      }),
      this.prisma.producerProfile.count({ where: whereClause }),
    ]);

    return { producers, total };
  }

  async getBySlugOrId(identifier: string): Promise<PublicProducerDetail | null> {
    const profile = await this.prisma.producerProfile.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        events: {
          where: mergePublicEventVisibility({
            status: 'APPROVED',
            deletedAt: null,
          }),
          orderBy: { startAt: 'asc' },
          select: {
            id: true,
            title: true,
            startAt: true,
            city: true,
            venueName: true,
            status: true,
            coverImageUrl: true,
            isTicketingEnabled: true,
            isGeneralPublication: true,
            ticketTypes: {
              where: { deletedAt: null, status: 'ACTIVE' },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!profile) return null;

    const { websiteUrl, instagramUrl } = parseSocialLinks(profile.socialLinks);
    const events: PublicProducerEventSummary[] = profile.events.map((e) =>
      mapPublicProducerEvent(e),
    );

    return {
      id: profile.id,
      slug: profile.slug,
      displayName: profile.displayName,
      shortDescription: profile.shortDescription,
      longDescription: profile.longDescription,
      logoUrl: profile.logoUrl,
      coverImageUrl: profile.coverImageUrl,
      gallery: parseGalleryUrls(profile.galleryUrls),
      primaryPhone: profile.primaryPhone,
      secondaryPhone: profile.secondaryPhone,
      primaryEmail: profile.primaryEmail,
      secondaryEmail: profile.secondaryEmail,
      whatsapp: profile.whatsapp,
      websiteUrl,
      instagramUrl,
      city: profile.city,
      country: profile.country,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      events,
    };
  }

  private async findActiveProfile(identifier: string) {
    return this.prisma.producerProfile.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ slug: identifier }, { id: identifier }],
      },
    });
  }

  private eventReviewsWhere(producerProfileId: string): Prisma.ReviewWhereInput {
    return {
      hiddenFromPublic: false,
      event: mergePublicEventVisibility({
        producerProfileId,
        status: 'APPROVED',
        deletedAt: null,
      }),
    };
  }

  async getReviewsSummary(identifier: string): Promise<ProducerReviewsSummary | null> {
    const profile = await this.findActiveProfile(identifier);
    if (!profile) return null;

    const reviews = await this.prisma.review.findMany({
      where: this.eventReviewsWhere(profile.id),
      select: { score: true },
    });

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      const s = Math.min(5, Math.max(1, r.score)) as 1 | 2 | 3 | 4 | 5;
      distribution[s] += 1;
      sum += r.score;
    }
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0 ? Math.round((sum / totalReviews) * 10) / 10 : null;

    return { averageRating, totalReviews, distribution };
  }

  async listReviews(
    identifier: string,
    query: ProducerReviewsListQuery,
  ): Promise<{ reviews: ProducerReviewListItem[]; page: number; total: number } | null> {
    const profile = await this.findActiveProfile(identifier);
    if (!profile) return null;

    const where: Prisma.ReviewWhereInput = this.eventReviewsWhere(profile.id);
    if (query.minScore != null) {
      where.score = query.minScore;
    }

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          event: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        eventId: r.event.id,
        eventTitle: r.event.title,
        rating: r.score,
        comment: r.comment,
        userDisplayName: r.user
          ? `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email
          : r.guestName?.trim() || 'Visitante',
        createdAt: r.createdAt.toISOString(),
      })),
      page: query.page,
      total,
    };
  }
}
