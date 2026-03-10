import { Injectable, NotFoundException } from '@nestjs/common';
import { ScanResult } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type { ProducerEventMetricsResponse } from '@yo-te-invito/shared';

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

    const [ticketsSold, courtesyCount, revenueResult, scanCount] =
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
        // Door scans from POST /scanner/scan
        this.prisma.ticketScanLog.count({
          where: { eventId, result: ScanResult.OK },
        }),
      ]);

    const revenueRaw = revenueResult._sum.totalAmount;
    const revenue = revenueRaw != null ? String(revenueRaw) : '0';
    const currency = 'ARS';

    return {
      ticketsSold,
      courtesyCount,
      revenue,
      currency,
      scanCount,
    };
  }
}
