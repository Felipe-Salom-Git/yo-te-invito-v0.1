import { Injectable } from '@nestjs/common';
import { Prisma, ReviewDisputeStatus } from '@prisma/client';
import type {
  AdminReviewsReportExportQuery,
  AdminReviewsReportQuery,
  AdminReviewsReportResponse,
  PublicReviewCategory,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  eventCategoryToReviewCategory,
  publicReviewVisibleWhere,
  readOverallRating,
} from './review-public.util';

const OPEN_DISPUTE_STATUSES: ReviewDisputeStatus[] = ['PENDING', 'IN_REVIEW'];
const CLOSED_DISPUTE_STATUSES: ReviewDisputeStatus[] = [
  'ACCEPTED',
  'REJECTED',
  'RESOLVED',
  'CANCELLED',
];

const VERTICALS: PublicReviewCategory[] = [
  'event',
  'gastro',
  'rental',
  'excursion',
  'hotel',
];

const PROBLEMATIC_LIMIT = 20;
const TOP_ENTITIES_LIMIT = 10;
const CSV_MAX_ROWS = 500;

type ProblematicReviewRow = {
  id: string;
  status: string;
  hiddenFromPublic: boolean;
  hiddenAt: Date | null;
  createdAt: Date;
  overallRating: number | null;
  score: number;
  guestName: string | null;
  user: { firstName: string; lastName: string } | null;
  event: {
    id: string;
    title: string;
    category: string | null;
    producerProfile: { displayName: string } | null;
  };
  disputeRequests: { id: string }[];
};

function reviewUserDisplayName(row: {
  guestName: string | null;
  user: { firstName: string; lastName: string } | null;
}): string {
  if (row.user) {
    return `${row.user.firstName} ${row.user.lastName}`.trim() || 'Usuario';
  }
  return row.guestName?.trim() || 'Invitado';
}

function hiddenReviewWhere(tenantId: string): Prisma.ReviewWhereInput {
  return {
    tenantId,
    OR: [
      { hiddenFromPublic: true },
      { status: { in: ['HIDDEN', 'DELETED_BY_USER', 'IN_REVIEW'] } },
    ],
  };
}

@Injectable()
export class AdminReviewsReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(
    tenantId: string,
    query: AdminReviewsReportQuery,
  ): Promise<AdminReviewsReportResponse> {
    const since = new Date();
    since.setDate(since.getDate() - query.days);

    const eventCategoryFilter = query.category
      ? { event: { category: query.category } }
      : {};

    const reviewBaseWhere: Prisma.ReviewWhereInput = {
      tenantId,
      ...eventCategoryFilter,
    };

    const [
      totalPublicReviews,
      totalHiddenReviews,
      openDisputes,
      closedDisputes,
      ratingRows,
      allCategoryRows,
      lowRatingRows,
      openDisputeRows,
      recentlyHiddenRows,
      disputeGroups,
    ] = await Promise.all([
      this.prisma.review.count({
        where: { ...reviewBaseWhere, ...publicReviewVisibleWhere },
      }),
      this.prisma.review.count({
        where: {
          ...hiddenReviewWhere(tenantId),
          ...eventCategoryFilter,
        },
      }),
      this.prisma.reviewDisputeRequest.count({
        where: {
          tenantId,
          status: { in: OPEN_DISPUTE_STATUSES },
          ...(query.category ? { event: { category: query.category } } : {}),
        },
      }),
      this.prisma.reviewDisputeRequest.count({
        where: {
          tenantId,
          status: { in: CLOSED_DISPUTE_STATUSES },
          ...(query.category ? { event: { category: query.category } } : {}),
        },
      }),
      this.prisma.review.findMany({
        where: { ...reviewBaseWhere, ...publicReviewVisibleWhere },
        select: {
          overallRating: true,
          score: true,
          event: { select: { category: true } },
        },
      }),
      this.prisma.review.findMany({
        where: reviewBaseWhere,
        select: { event: { select: { category: true } } },
      }),
      this.prisma.review.findMany({
        where: {
          ...reviewBaseWhere,
          ...publicReviewVisibleWhere,
          OR: [
            { overallRating: { lte: 3 } },
            { overallRating: null, score: { lte: 2 } },
          ],
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              producerProfile: { select: { displayName: true } },
            },
          },
          user: { select: { firstName: true, lastName: true } },
          disputeRequests: {
            where: { status: { in: OPEN_DISPUTE_STATUSES } },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: PROBLEMATIC_LIMIT,
      }),
      this.prisma.review.findMany({
        where: {
          ...reviewBaseWhere,
          disputeRequests: {
            some: { status: { in: OPEN_DISPUTE_STATUSES } },
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              producerProfile: { select: { displayName: true } },
            },
          },
          user: { select: { firstName: true, lastName: true } },
          disputeRequests: {
            where: { status: { in: OPEN_DISPUTE_STATUSES } },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: PROBLEMATIC_LIMIT,
      }),
      this.prisma.review.findMany({
        where: {
          ...reviewBaseWhere,
          hiddenFromPublic: true,
          hiddenAt: { gte: since },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              producerProfile: { select: { displayName: true } },
            },
          },
          user: { select: { firstName: true, lastName: true } },
          disputeRequests: {
            where: { status: { in: OPEN_DISPUTE_STATUSES } },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { hiddenAt: 'desc' },
        take: PROBLEMATIC_LIMIT,
      }),
      this.prisma.reviewDisputeRequest.groupBy({
        by: ['eventId'],
        where: {
          tenantId,
          ...(query.category ? { event: { category: query.category } } : {}),
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: TOP_ENTITIES_LIMIT,
      }),
    ]);

    const byVertical = this.buildVerticalSummary(ratingRows, allCategoryRows);
    const problematicReviews = this.mergeProblematicSignals(
      lowRatingRows,
      openDisputeRows,
      recentlyHiddenRows,
    );
    const topDisputedEntities = await this.buildTopDisputedEntities(
      tenantId,
      disputeGroups,
    );

    return {
      generatedAt: new Date().toISOString(),
      scopeNote:
        'Resumen de reseñas públicas (Reviews V2). Las valoraciones comerciales B2B entre productora y referido no están incluidas.',
      kpis: {
        totalPublicReviews,
        totalHiddenReviews,
        openDisputes,
        closedDisputes,
      },
      byVertical,
      problematicReviews,
      topDisputedEntities,
    };
  }

  async exportCsv(tenantId: string, query: AdminReviewsReportExportQuery): Promise<string> {
    const report = await this.getReport(tenantId, query);
    const lines: string[] = [];

    if (query.dataset === 'disputes') {
      lines.push(
        'eventId,eventTitle,category,producer,disputeCount,openDisputeCount',
      );
      for (const row of report.topDisputedEntities.slice(0, CSV_MAX_ROWS)) {
        lines.push(
          [
            this.csvCell(row.eventId),
            this.csvCell(row.eventTitle),
            row.eventCategory,
            this.csvCell(row.producerDisplayName ?? ''),
            row.disputeCount,
            row.openDisputeCount,
          ].join(','),
        );
      }
      return lines.join('\n');
    }

    lines.push(
      'reviewId,eventTitle,category,rating,status,hidden,signal,userDisplayName,createdAt,disputeId',
    );
    for (const row of report.problematicReviews.slice(0, CSV_MAX_ROWS)) {
      lines.push(
        [
          this.csvCell(row.reviewId),
          this.csvCell(row.eventTitle),
          row.eventCategory,
          row.overallRating,
          row.status,
          row.hiddenFromPublic ? 'yes' : 'no',
          row.signal,
          this.csvCell(row.userDisplayName),
          row.createdAt,
          this.csvCell(row.openDisputeId ?? ''),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  private csvCell(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private buildVerticalSummary(
    publicRows: Array<{
      overallRating: number | null;
      score: number;
      event: { category: string | null };
    }>,
    allRows: Array<{ event: { category: string | null } }>,
  ): AdminReviewsReportResponse['byVertical'] {
    const buckets = new Map<
      PublicReviewCategory,
      { sum: number; publicCount: number; totalCount: number }
    >();
    for (const v of VERTICALS) {
      buckets.set(v, { sum: 0, publicCount: 0, totalCount: 0 });
    }

    for (const row of allRows) {
      const cat = eventCategoryToReviewCategory(row.event.category);
      buckets.get(cat)!.totalCount += 1;
    }

    for (const row of publicRows) {
      const cat = eventCategoryToReviewCategory(row.event.category);
      const bucket = buckets.get(cat)!;
      bucket.sum += readOverallRating(row);
      bucket.publicCount += 1;
    }

    return VERTICALS.map((category) => {
      const b = buckets.get(category)!;
      return {
        category,
        reviewCount: b.totalCount,
        publicReviewCount: b.publicCount,
        averageRating:
          b.publicCount > 0 ? Math.round((b.sum / b.publicCount) * 10) / 10 : null,
      };
    });
  }

  private mergeProblematicSignals(
    lowRating: ProblematicReviewRow[],
    openDispute: ProblematicReviewRow[],
    recentlyHidden: ProblematicReviewRow[],
  ): AdminReviewsReportResponse['problematicReviews'] {
    const seen = new Set<string>();
    const out: AdminReviewsReportResponse['problematicReviews'] = [];

    const push = (
      row: (typeof lowRating)[0],
      signal: 'low_rating' | 'open_dispute' | 'recently_hidden',
    ) => {
      if (seen.has(row.id)) return;
      seen.add(row.id);
      if (out.length >= PROBLEMATIC_LIMIT) return;

      const openDisputeId = row.disputeRequests[0]?.id ?? null;
      out.push({
        id: `${signal}:${row.id}`,
        reviewId: row.id,
        eventId: row.event.id,
        eventTitle: row.event.title,
        eventCategory: eventCategoryToReviewCategory(row.event.category),
        overallRating: readOverallRating(row),
        status: row.status as AdminReviewsReportResponse['problematicReviews'][0]['status'],
        hiddenFromPublic: row.hiddenFromPublic,
        hasOpenDispute: Boolean(openDisputeId),
        openDisputeId,
        userDisplayName: reviewUserDisplayName(row),
        signal,
        createdAt: row.createdAt.toISOString(),
        hiddenAt: row.hiddenAt?.toISOString() ?? null,
        href: openDisputeId
          ? `/admin/review-disputes?id=${openDisputeId}`
          : '/admin/review-disputes',
      });
    };

    for (const row of openDispute) push(row, 'open_dispute');
    for (const row of recentlyHidden) push(row, 'recently_hidden');
    for (const row of lowRating) push(row, 'low_rating');

    return out;
  }

  private async buildTopDisputedEntities(
    tenantId: string,
    groups: Array<{ eventId: string; _count: { id: number } }>,
  ): Promise<AdminReviewsReportResponse['topDisputedEntities']> {
    if (groups.length === 0) return [];

    const eventIds = groups.map((g) => g.eventId);
    const events = await this.prisma.event.findMany({
      where: { id: { in: eventIds }, tenantId },
      select: {
        id: true,
        title: true,
        category: true,
        producerProfile: { select: { displayName: true } },
      },
    });
    const eventMap = new Map(events.map((e) => [e.id, e]));

    const openCounts = await this.prisma.reviewDisputeRequest.groupBy({
      by: ['eventId'],
      where: {
        tenantId,
        eventId: { in: eventIds },
        status: { in: OPEN_DISPUTE_STATUSES },
      },
      _count: { id: true },
    });
    const openMap = new Map(openCounts.map((o) => [o.eventId, o._count.id]));

    return groups
      .map((g) => {
        const event = eventMap.get(g.eventId);
        if (!event) return null;
        return {
          eventId: event.id,
          eventTitle: event.title,
          eventCategory: eventCategoryToReviewCategory(event.category),
          producerDisplayName: event.producerProfile?.displayName ?? null,
          disputeCount: g._count.id,
          openDisputeCount: openMap.get(g.eventId) ?? 0,
          href: `/admin/review-disputes?category=${eventCategoryToReviewCategory(event.category)}&q=${encodeURIComponent(event.title)}`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }
}
