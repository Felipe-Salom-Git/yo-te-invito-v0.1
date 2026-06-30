import { Injectable } from '@nestjs/common';
import { ProfileStatus } from '@prisma/client';
import type { AdminDashboardResponse } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

const OPEN_DISPUTE_STATUSES = ['PENDING', 'IN_REVIEW'] as const;
const PENDING_QUEUE_LIMIT = 12;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string): Promise<AdminDashboardResponse> {
    const now = new Date();

    const [
      pendingEvents,
      eventsDraftCount,
      activeEvents,
      registeredUsers,
      activeProducers,
      pendingDisputes,
      gastroDiscountsPendingCount,
      ticketsSold,
      totalReviews,
      pendingRows,
      draftRows,
      pendingGastroDiscountRows,
    ] = await Promise.all([
      this.prisma.event.count({
        where: { tenantId, deletedAt: null, status: 'PENDING' },
      }),
      this.prisma.event.count({
        where: { tenantId, deletedAt: null, status: 'DRAFT' },
      }),
      this.prisma.event.count({
        where: {
          tenantId,
          deletedAt: null,
          status: 'APPROVED',
          startAt: { gte: now },
        },
      }),
      this.prisma.user.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.producerProfile.count({
        where: { tenantId, status: ProfileStatus.ACTIVE },
      }),
      this.prisma.reviewDisputeRequest.count({
        where: {
          tenantId,
          status: { in: [...OPEN_DISPUTE_STATUSES] },
        },
      }),
      this.prisma.gastroDiscount.count({
        where: {
          tenantId,
          status: { in: ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'] },
        },
      }),
      this.prisma.ticket.count({
        where: {
          status: { not: 'REVOKED' },
          event: { tenantId, deletedAt: null },
        },
      }),
      this.prisma.review.count({ where: { tenantId } }),
      this.prisma.event.findMany({
        where: { tenantId, deletedAt: null, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: PENDING_QUEUE_LIMIT,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          city: true,
          startAt: true,
          createdAt: true,
          producerProfileId: true,
          producerProfile: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.event.findMany({
        where: { tenantId, deletedAt: null, status: 'DRAFT' },
        orderBy: { updatedAt: 'desc' },
        take: PENDING_QUEUE_LIMIT,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          city: true,
          startAt: true,
          createdAt: true,
          producerProfileId: true,
          producerProfile: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.gastroDiscount.findMany({
        where: {
          tenantId,
          status: { in: ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'] },
        },
        orderBy: { createdAt: 'desc' },
        take: PENDING_QUEUE_LIMIT,
        select: {
          id: true,
          displayTitle: true,
          code: true,
          status: true,
          createdAt: true,
          gastroProfileId: true,
          gastroProfile: { select: { id: true, displayName: true } },
        },
      }),
    ]);

    const mapEventRow = (
      e: (typeof pendingRows)[number],
    ): AdminDashboardResponse['pendingEvents'][0] => ({
      id: e.id,
      title: e.title,
      category: e.category,
      status: e.status.toLowerCase() as AdminDashboardResponse['pendingEvents'][0]['status'],
      city: e.city,
      producerName: e.producerProfile?.displayName ?? null,
      producerProfileId: e.producerProfileId ?? e.producerProfile?.id ?? null,
      startAt: e.startAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
    });

    return {
      metrics: {
        pendingEvents,
        eventsDraftCount,
        activeEvents,
        registeredUsers,
        activeProducers,
        pendingDisputes,
        gastroDiscountsPendingCount,
        ticketsSold,
        totalReviews,
      },
      pendingEvents: pendingRows.map(mapEventRow),
      draftEvents: draftRows.map(mapEventRow),
      pendingGastroDiscounts: pendingGastroDiscountRows.map((d) => ({
        id: d.id,
        title: d.displayTitle?.trim() || d.code,
        profileId: d.gastroProfileId ?? d.gastroProfile?.id ?? null,
        profileName: d.gastroProfile?.displayName ?? null,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }
}
