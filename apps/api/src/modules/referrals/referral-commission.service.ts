import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateReferralCommissionAmount,
  type OrderItemSubtotalInput,
} from './referral-commission.util';

const PAID_ORDER = 'PAID' as const;

@Injectable()
export class ReferralCommissionService {
  private readonly logger = new Logger(ReferralCommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera o actualiza comisión V2 cuando la orden queda PAID (demo-confirm / webhook futuro).
   * Idempotente por referralAttributionId / orderId.
   */
  async processOrderPaidInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    tenantId: string,
  ): Promise<{ created: boolean; commissionId: string | null }> {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId, status: PAID_ORDER },
      include: {
        orderItems: true,
        tickets: { select: { id: true, status: true, orderItemId: true } },
        referralLink: {
          include: {
            commercialAgreement: true,
            eventAssignment: { select: { status: true } },
          },
        },
      },
    });

    if (!order?.referralLinkId || !order.referralLink) {
      return { created: false, commissionId: null };
    }

    const attribution = await tx.referralAttribution.findUnique({
      where: { orderId },
    });
    if (!attribution) {
      return { created: false, commissionId: null };
    }

    const agreement = order.referralLink.commercialAgreement;
    if (!agreement || agreement.status !== 'ACTIVE') {
      return { created: false, commissionId: null };
    }

    const assignment = order.referralLink.eventAssignment;
    if (assignment && assignment.status !== 'ACTIVE') {
      return { created: false, commissionId: null };
    }

    const orderItemsInput = this.buildOrderItemsInput(order.orderItems);
    const validTicketCount = this.countValidTickets(order.tickets);

    const calc = calculateReferralCommissionAmount({
      commissionType: agreement.commissionType,
      commissionValue: Number(agreement.commissionValue),
      orderItems: orderItemsInput,
      validTicketCount,
    });

    if (!calc) {
      await this.cancelV2CommissionIfExists(tx, attribution.id);
      return { created: false, commissionId: null };
    }

    const referrerUserId = await this.resolveReferrerUserId(
      tx,
      tenantId,
      agreement.referrerProfileId,
    );
    if (!referrerUserId) {
      this.logger.warn(
        `No active referrer user for profile ${agreement.referrerProfileId}, order ${orderId}`,
      );
      return { created: false, commissionId: null };
    }

    const existing = await tx.referralCommission.findFirst({
      where: {
        OR: [{ referralAttributionId: attribution.id }, { orderId }],
      },
    });

    const data = {
      tenantId,
      referrerId: referrerUserId,
      referralLinkId: order.referralLinkId,
      eventId: order.eventId,
      amountCents: calc.amountCents,
      status: 'CONFIRMED' as const,
      referralAttributionId: attribution.id,
      agreementId: agreement.id,
      producerProfileId: agreement.producerProfileId,
      referrerProfileId: agreement.referrerProfileId,
      orderId,
      commissionType: agreement.commissionType,
      commissionValue: agreement.commissionValue,
      attributedSubtotalCents: calc.attributedSubtotalCents,
      ticketQuantity: calc.ticketQuantity,
    };

    if (existing) {
      if (existing.status === 'CONFIRMED' && existing.amountCents === calc.amountCents) {
        return { created: false, commissionId: existing.id };
      }
      const updated = await tx.referralCommission.update({
        where: { id: existing.id },
        data,
      });
      return { created: false, commissionId: updated.id };
    }

    const created = await tx.referralCommission.create({ data });
    return { created: true, commissionId: created.id };
  }

  /** Re-sincroniza comisión tras revocación de tickets (parcial o total). */
  async syncOrderCommissionInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    tenantId: string,
  ): Promise<void> {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId },
      select: { status: true },
    });
    if (!order || order.status !== PAID_ORDER) {
      await this.cancelV2CommissionByOrderId(tx, orderId);
      return;
    }
    await this.processOrderPaidInTransaction(tx, orderId, tenantId);
  }

  private async cancelV2CommissionIfExists(
    tx: Prisma.TransactionClient,
    referralAttributionId: string,
  ): Promise<void> {
    await tx.referralCommission.updateMany({
      where: {
        referralAttributionId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED' },
    });
  }

  private async cancelV2CommissionByOrderId(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    await tx.referralCommission.updateMany({
      where: {
        orderId,
        referralAttributionId: { not: null },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED' },
    });
  }

  private buildOrderItemsInput(
    orderItems: Array<{ quantity: number; subtotal: { toString(): string } }>,
  ): OrderItemSubtotalInput[] {
    return orderItems.map((oi) => ({
      quantity: oi.quantity,
      subtotalMajor: Number(oi.subtotal.toString()),
    }));
  }

  private countValidTickets(
    tickets: Array<{ status: string }>,
  ): number {
    return tickets.filter((t) => t.status === 'VALID' || t.status === 'USED').length;
  }

  private async resolveReferrerUserId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    referrerProfileId: string,
  ): Promise<string | null> {
    const membership = await tx.userReferrerMembership.findFirst({
      where: {
        tenantId,
        profileId: referrerProfileId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    return membership?.userId ?? null;
  }
}
