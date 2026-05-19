import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { TicketBatchService } from '../../ticketing/ticket-batch.service';

@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketBatches: TicketBatchService,
  ) {}

  @Cron('0 */3 * * * *')
  handleExpireOrdersCron() {
    return this.expireOrdersJob();
  }

  /**
   * Expire pending orders where expiresAt < now.
   * Releases reserved stock and writes AuditLog ORDER_EXPIRED.
   * Uses atomic conditional update to prevent race with payment attempts.
   */
  async expireOrdersJob(): Promise<{ expired: number }> {
    const now = new Date();

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lt: now },
      },
      include: { orderItems: true },
    });

    if (expiredOrders.length === 0) {
      return { expired: 0 };
    }

    let expired = 0;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const order of expiredOrders) {
        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING_PAYMENT',
            expiresAt: { lt: now },
          },
          data: {
            status: 'EXPIRED',
            expiredAt: now,
          },
        });

        if (result.count > 0) {
          expired += 1;
          for (const oi of order.orderItems) {
            await this.ticketBatches.releaseReservation(
              tx,
              oi.ticketBatchId ?? null,
              oi.quantity,
            );
            await tx.ticketType.updateMany({
              where: { id: oi.ticketTypeId },
              data: { capacityAvailable: { increment: oi.quantity } },
            });
          }
          await tx.auditLog.create({
            data: {
              tenantId: order.tenantId,
              actorId: 'order-expiration-worker',
              actorRole: 'SYSTEM',
              action: AuditAction.ORDER_EXPIRED,
              entityType: 'Order',
              entityId: order.id,
              before: {
                status: 'PENDING_PAYMENT',
                expiresAt: order.expiresAt?.toISOString() ?? null,
              } as object,
              after: {
                status: 'EXPIRED',
                expiredAt: now.toISOString(),
              } as object,
            },
          });
        }
      }
    });

    if (expired > 0) {
      this.logger.log(`Expired ${expired} order(s)`);
    }

    return { expired };
  }
}
