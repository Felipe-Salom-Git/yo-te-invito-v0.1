import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { renderPayoutRequestEmail, renderPayoutReceivedConfirmation } from '../../email/email-templates';
import type { PayoutRequest } from './payouts.types';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  private toPayoutRequest(p: {
    id: string;
    tenantId: string;
    eventId: string;
    producerId: string;
    status: string;
    amountCents: number;
    bankInfo: unknown;
    requestedByUserId: string;
    createdAt: Date;
  }): PayoutRequest {
    return {
      id: p.id,
      tenantId: p.tenantId,
      eventId: p.eventId,
      producerId: p.producerId,
      status: p.status as PayoutRequest['status'],
      amountCents: p.amountCents,
      bankInfo: p.bankInfo as PayoutRequest['bankInfo'],
      requestedByUserId: p.requestedByUserId,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async listByProducer(userId: string, tenantId?: string): Promise<PayoutRequest[]> {
    const profileIds = tenantId
      ? (await this.prisma.userProducerMembership.findMany({
          where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
          select: { profileId: true },
        })).map((m) => m.profileId)
      : [];
    const orClause =
      profileIds.length > 0
        ? [{ producerId: userId }, { producerProfileId: { in: profileIds } }]
        : [{ producerId: userId }];
    const items = await this.prisma.payout.findMany({
      where: { ...(tenantId && { tenantId }), OR: orClause },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((p) => this.toPayoutRequest(p));
  }

  async listByEvent(eventId: string, tenantId?: string): Promise<PayoutRequest[]> {
    const where: { eventId: string; tenantId?: string } = { eventId };
    if (tenantId) where.tenantId = tenantId;
    const items = await this.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return items.map((p) => this.toPayoutRequest(p));
  }

  async listAll(tenantId?: string): Promise<PayoutRequest[]> {
    const where = tenantId ? { tenantId } : {};
    const items = await this.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return items.map((p) => this.toPayoutRequest(p));
  }

  async updateStatus(
    payoutId: string,
    status: string,
    tenantId?: string,
  ): Promise<PayoutRequest | null> {
    const where: { id: string; tenantId?: string } = { id: payoutId };
    if (tenantId) where.tenantId = tenantId;
    const existing = await this.prisma.payout.findFirst({ where });
    if (!existing) return null;
    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: status as 'REQUESTED' | 'PENDING' | 'PROCESSING' | 'SENT' | 'REJECTED' },
    });
    return this.toPayoutRequest(updated);
  }

  async create(
    tenantId: string,
    eventId: string,
    producerId: string,
    amountCents: number,
    requestedByUserId: string,
    bankInfo?: { titular?: string; banco?: string; cbu?: string },
    producerProfileId?: string | null,
  ): Promise<PayoutRequest> {
    const created = await this.prisma.payout.create({
      data: {
        tenantId,
        eventId,
        producerId,
        producerProfileId: producerProfileId ?? undefined,
        amountCents,
        requestedByUserId,
        bankInfo: bankInfo ?? undefined,
      },
    });

    const [event, producerUser] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
      this.prisma.user.findUnique({
        where: { id: requestedByUserId },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);
    const eventTitle = event?.title ?? 'Evento';
    const producerName = producerUser
      ? `${producerUser.firstName} ${producerUser.lastName}`
      : 'Productor';

    const adminEmail = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM;
    if (adminEmail) {
      const { html, text } = renderPayoutRequestEmail(producerName, amountCents, eventTitle);
      await this.emailQueue.enqueue({
        to: adminEmail,
        subject: 'Nueva solicitud de retiro',
        html,
        text,
      });
    }

    if (producerUser?.email) {
      const { html, text } = renderPayoutReceivedConfirmation(producerName, amountCents, eventTitle);
      await this.emailQueue.enqueue({
        to: producerUser.email,
        subject: 'Recibimos tu solicitud de retiro',
        html,
        text,
      });
    }

    return this.toPayoutRequest(created);
  }
}
