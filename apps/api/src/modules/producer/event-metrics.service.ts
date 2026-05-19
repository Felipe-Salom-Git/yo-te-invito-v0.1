import { Injectable, NotFoundException } from '@nestjs/common';
import { ScanResult } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type {
  ProducerEventMetricsResponse,
  ProducerEventReferralPerformance,
} from '@yo-te-invito/shared';

@Injectable()
export class EventMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(
    tenantId: string,
    eventId: string,
  ): Promise<ProducerEventMetricsResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Event not found',
      });
    }

    const [ticketsSold, courtesyCount, revenueResult, scanCount, assignments] =
      await Promise.all([
        this.prisma.ticket.count({
          where: {
            eventId,
            status: { not: 'REVOKED' },
          },
        }),
        this.prisma.courtesyGrant.count({
          where: { eventId },
        }),
        this.prisma.order.aggregate({
          where: {
            eventId,
            status: 'PAID',
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.ticketScanLog.count({
          where: { eventId, result: ScanResult.OK },
        }),
        this.prisma.eventReferrerAssignment.findMany({
          where: { eventId },
          include: {
            referralLink: { select: { id: true, code: true } },
            referrerProfile: { select: { id: true, displayName: true } },
          },
        }),
      ]);

    const revenueRaw = revenueResult._sum.totalAmount;
    const revenue = revenueRaw != null ? String(revenueRaw) : '0';
    const currency = 'ARS';

    const referralPerformance = await this.buildReferralPerformance(
      eventId,
      assignments,
    );

    return {
      ticketsSold,
      courtesyCount,
      revenue,
      currency,
      scanCount,
      referralPerformance,
    };
  }

  private async buildReferralPerformance(
    eventId: string,
    assignments: Array<{
      eventId: string;
      referrerProfileId: string;
      referralLink: { id: string; code: string } | null;
      referrerProfile: { id: string; displayName: string } | null;
    }>,
  ): Promise<ProducerEventReferralPerformance[]> {
    const linkIds = assignments
      .map((a) => a.referralLink?.id)
      .filter((id): id is string => !!id);
    if (linkIds.length === 0) return [];

    const attributions = await this.prisma.referralAttribution.findMany({
      where: { eventId, referralLinkId: { in: linkIds } },
      select: { orderId: true, referralLinkId: true },
    });
    if (attributions.length === 0) {
      return assignments
        .filter((a) => a.referralLink)
        .map((a) => ({
          referralLinkId: a.referralLink!.id,
          code: a.referralLink!.code,
          referrerProfileId: a.referrerProfileId,
          referrerDisplayName: a.referrerProfile?.displayName ?? null,
          paidOrdersCount: 0,
          ticketsSoldCount: 0,
          grossRevenueCents: 0,
        }));
    }

    const orderIds = [...new Set(attributions.map((x) => x.orderId))];
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        orderItems: { select: { quantity: true } },
      },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const byLink = new Map<
      string,
      { paidOrders: number; tickets: number; cents: number }
    >();
    for (const a of attributions) {
      const o = orderMap.get(a.orderId);
      if (!o || o.status !== 'PAID') continue;
      const qty = o.orderItems.reduce((s, it) => s + it.quantity, 0);
      const cents = Math.round(Number(o.totalAmount) * 100);
      const cur = byLink.get(a.referralLinkId) ?? {
        paidOrders: 0,
        tickets: 0,
        cents: 0,
      };
      cur.paidOrders += 1;
      cur.tickets += qty;
      cur.cents += Number.isFinite(cents) ? cents : 0;
      byLink.set(a.referralLinkId, cur);
    }

    return assignments
      .filter((a) => a.referralLink)
      .map((a) => {
        const p = byLink.get(a.referralLink!.id) ?? {
          paidOrders: 0,
          tickets: 0,
          cents: 0,
        };
        return {
          referralLinkId: a.referralLink!.id,
          code: a.referralLink!.code,
          referrerProfileId: a.referrerProfileId,
          referrerDisplayName: a.referrerProfile?.displayName ?? null,
          paidOrdersCount: p.paidOrders,
          ticketsSoldCount: p.tickets,
          grossRevenueCents: p.cents,
        };
      });
  }
}
