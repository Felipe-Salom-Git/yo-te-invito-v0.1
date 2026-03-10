import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type { FraudSignalsQuery, FraudSignalsResponse } from '@yo-te-invito/shared';

@Injectable()
export class AdminFraudService {
  constructor(private readonly prisma: PrismaService) {}

  async listFraudSignals(
    tenantId: string,
    eventId: string,
    query: FraudSignalsQuery,
  ): Promise<FraudSignalsResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Event not found',
      });
    }

    const where: {
      eventId: string;
      tenantId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { eventId, tenantId };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.fraudSignal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.fraudSignal.count({ where }),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        signalType: r.signalType,
        deviceId: r.deviceId,
        ipAddress: r.ipAddress,
        scanCount: r.scanCount,
        windowStart: r.windowStart.toISOString(),
        windowEnd: r.windowEnd.toISOString(),
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }
}
