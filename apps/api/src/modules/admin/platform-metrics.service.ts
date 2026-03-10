import { Injectable } from '@nestjs/common';
import { ScanResult } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { PlatformMetricsResponse } from '@yo-te-invito/shared';

@Injectable()
export class PlatformMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<PlatformMetricsResponse> {
    const now = new Date();

    const [totalEvents, activeEvents, ticketsSold, totalReviews, totalScans] =
      await Promise.all([
        this.prisma.event.count({
          where: { deletedAt: null },
        }),
        this.prisma.event.count({
          where: {
            deletedAt: null,
            status: 'APPROVED',
            startAt: { gte: now },
          },
        }),
        this.prisma.ticket.count({
          where: { status: { not: 'REVOKED' } },
        }),
        this.prisma.review.count(),
        // Door scans from POST /scanner/scan
        this.prisma.ticketScanLog.count({
          where: { result: ScanResult.OK },
        }),
      ]);

    const ticketsValidated = totalScans; // Door scans = validated entries
    const usageRatePercent =
      ticketsSold > 0 ? Math.round((totalScans / ticketsSold) * 100) : 0;

    return {
      totalEvents,
      activeEvents,
      ticketsSold,
      totalReviews,
      totalScans,
      ticketsValidated,
      usageRatePercent,
    };
  }
}
