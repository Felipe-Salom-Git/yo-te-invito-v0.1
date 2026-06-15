import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

const HISTORY_MESSAGE =
  'Esta publicación tiene historial operativo y no puede eliminarse definitivamente. Podés pausarla/archivarla para ocultarla.';

@Injectable()
export class AdminContentPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  private rejectIfHistory(): never {
    throw new BadRequestException({
      code: ErrorCode.CONTENT_HAS_HISTORY,
      message: HISTORY_MESSAGE,
    });
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      actorId: string;
      actorRole: string;
      action: AuditAction;
      entityType: string;
      entityId: string;
      before: object;
      after: object;
      reason?: string;
    },
  ) {
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before,
        after: input.after,
        metadata: {
          hardDelete: true,
          ...(input.reason ? { reason: input.reason } : {}),
        },
      },
    });
  }

  private async eventHasCriticalHistory(tenantId: string, eventId: string): Promise<boolean> {
    const [orders, tickets, scans, reviews, transfers, payments] = await Promise.all([
      this.prisma.order.count({ where: { eventId, tenantId } }),
      this.prisma.ticket.count({ where: { eventId } }),
      this.prisma.ticketScan.count({ where: { eventId, tenantId } }),
      this.prisma.review.count({ where: { eventId, tenantId } }),
      this.prisma.ticketTransferOffer.count({
        where: { sourceTicket: { eventId }, tenantId },
      }),
      this.prisma.payment.count({ where: { order: { eventId, tenantId } } }),
    ]);
    return orders + tickets + scans + reviews + transfers + payments > 0;
  }

  async hardDeleteEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: true }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    if (await this.eventHasCriticalHistory(tenantId, eventId)) {
      this.rejectIfHistory();
    }

    const before = {
      id: event.id,
      title: event.title,
      status: event.status,
      category: event.category,
    };

    await this.prisma.$transaction(async (tx) => {
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EVENT_CANCELLED,
        entityType: 'Event',
        entityId: eventId,
        before,
        after: { deleted: true },
        reason,
      });
      await tx.eventSubcategory.deleteMany({ where: { eventId } });
      await tx.eventTag.deleteMany({ where: { eventId } });
      await tx.eventMedia.deleteMany({ where: { eventId } });
      await tx.eventOccurrence.deleteMany({ where: { eventId } });
      await tx.categoryBannerItem.deleteMany({ where: { eventId } });
      await tx.gastroContent.deleteMany({ where: { eventId } });
      await tx.ticketType.deleteMany({ where: { eventId } });
      await tx.event.update({
        where: { id: eventId },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });
    });

    return { id: eventId, deleted: true };
  }

  async hardDeleteGastroProfile(
    tenantId: string,
    actorId: string,
    actorRole: string,
    profileId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: true }> {
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro profile not found',
      });
    }

    if (profile.publicEventId) {
      if (await this.eventHasCriticalHistory(tenantId, profile.publicEventId)) {
        this.rejectIfHistory();
      }
    }

    const [validations, claims] = await Promise.all([
      this.prisma.gastroDiscountValidation.count({
        where: { discount: { gastroProfileId: profileId } },
      }),
      this.prisma.gastroDiscountClaim.count({
        where: { discount: { gastroProfileId: profileId } },
      }),
    ]);
    if (validations + claims > 0) {
      this.rejectIfHistory();
    }

    const before = { id: profile.id, displayName: profile.displayName, status: profile.status };

    await this.prisma.$transaction(async (tx) => {
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.GASTRO_PROFILE_SUSPENDED,
        entityType: 'GastroProfile',
        entityId: profileId,
        before,
        after: { deleted: true },
        reason,
      });

      const discounts = await tx.gastroDiscount.findMany({
        where: { gastroProfileId: profileId },
        select: { id: true },
      });
      for (const d of discounts) {
        await tx.gastroDiscount.delete({ where: { id: d.id } });
      }
      await tx.gastroContent.deleteMany({ where: { gastroProfileId: profileId } });
      await tx.userGastroFollow.deleteMany({ where: { gastroProfileId: profileId } });

      if (profile.publicEventId) {
        await this.purgeEventInTx(tx, tenantId, profile.publicEventId);
      }

      await tx.gastroProfile.delete({ where: { id: profileId } });
    });

    return { id: profileId, deleted: true };
  }

  async hardDeleteRentalLocation(
    tenantId: string,
    actorId: string,
    actorRole: string,
    locationId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: true }> {
    const location = await this.prisma.rentalLocation.findFirst({
      where: { id: locationId, tenantId, deletedAt: null },
    });
    if (!location) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental location not found',
      });
    }

    const products = await this.prisma.event.findMany({
      where: { rentalLocationId: locationId, tenantId, deletedAt: null },
      select: { id: true },
    });
    for (const product of products) {
      if (await this.eventHasCriticalHistory(tenantId, product.id)) {
        this.rejectIfHistory();
      }
    }

    const before = { id: location.id, name: location.name, isActive: location.isActive };

    await this.prisma.$transaction(async (tx) => {
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.RENTAL_LOCATION_DEACTIVATED,
        entityType: 'RentalLocation',
        entityId: locationId,
        before,
        after: { deleted: true },
        reason,
      });

      for (const product of products) {
        await this.purgeEventInTx(tx, tenantId, product.id);
      }

      await tx.rentalLocation.update({
        where: { id: locationId },
        data: { deletedAt: new Date(), isActive: false },
      });
    });

    return { id: locationId, deleted: true };
  }

  async hardDeleteExcursionOperator(
    tenantId: string,
    actorId: string,
    actorRole: string,
    operatorId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: true }> {
    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: operatorId, tenantId, deletedAt: null },
    });
    if (!operator) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion operator not found',
      });
    }

    const excursions = await this.prisma.event.findMany({
      where: { excursionOperatorId: operatorId, tenantId, deletedAt: null },
      select: { id: true },
    });
    for (const excursion of excursions) {
      if (await this.eventHasCriticalHistory(tenantId, excursion.id)) {
        this.rejectIfHistory();
      }
    }

    const before = { id: operator.id, name: operator.name, isActive: operator.isActive };

    await this.prisma.$transaction(async (tx) => {
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EXCURSION_OPERATOR_DEACTIVATED,
        entityType: 'ExcursionOperator',
        entityId: operatorId,
        before,
        after: { deleted: true },
        reason,
      });

      for (const excursion of excursions) {
        await this.purgeEventInTx(tx, tenantId, excursion.id);
      }

      await tx.excursionOperator.update({
        where: { id: operatorId },
        data: { deletedAt: new Date(), isActive: false },
      });
    });

    return { id: operatorId, deleted: true };
  }

  private async purgeEventInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    eventId: string,
  ): Promise<void> {
    await tx.eventSubcategory.deleteMany({ where: { eventId } });
    await tx.eventTag.deleteMany({ where: { eventId } });
    await tx.eventMedia.deleteMany({ where: { eventId } });
    await tx.eventOccurrence.deleteMany({ where: { eventId } });
    await tx.categoryBannerItem.deleteMany({ where: { eventId } });
    await tx.gastroContent.deleteMany({ where: { eventId } });
    await tx.ticketType.deleteMany({ where: { eventId } });
    await tx.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }
}
