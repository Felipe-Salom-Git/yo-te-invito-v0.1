import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublicationAlertsService } from '../notifications/event-publication-alerts.service';

@Injectable()
export class AdminContentLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicationAlerts: EventPublicationAlertsService,
  ) {}

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
        ...(input.reason ? { metadata: { reason: input.reason } } : {}),
      },
    });
  }

  /** Archive / dar de baja — Event status APPROVED → PAUSED (preserves history). */
  async pauseEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason?: string,
  ): Promise<{ id: string; status: string }> {
    const event = await this.assertEvent(tenantId, eventId);
    if (event.status !== 'APPROVED') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se puede archivar contenido publicado (APPROVED)',
      });
    }

    const before = { status: event.status };
    const after = { status: 'PAUSED' as const, intent: 'archive', reason };

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'PAUSED' },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EVENT_POSTPONED,
        entityType: 'Event',
        entityId: eventId,
        before,
        after,
        reason,
      });
    });

    return { id: eventId, status: 'paused' };
  }

  /** Restore archived event PAUSED → APPROVED. */
  async restoreEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason?: string,
  ): Promise<{ id: string; status: string }> {
    const event = await this.assertEvent(tenantId, eventId);
    if (event.status !== 'PAUSED') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se puede restaurar contenido archivado (PAUSED)',
      });
    }

    const previousStatus = event.status;
    const before = { status: previousStatus };
    const now = new Date();
    const after = {
      status: 'APPROVED' as const,
      publishedAt: now.toISOString(),
      reason,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'APPROVED', publishedAt: now },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EVENT_RESTORED,
        entityType: 'Event',
        entityId: eventId,
        before,
        after,
        reason,
      });
    });

    this.publicationAlerts.handleEventBecameApproved(
      tenantId,
      eventId,
      previousStatus,
    );

    return { id: eventId, status: 'approved' };
  }

  async deactivateRentalLocation(
    tenantId: string,
    actorId: string,
    actorRole: string,
    locationId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const row = await this.assertRentalLocation(tenantId, locationId);
    if (!row.isActive) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'El local ya está dado de baja',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rentalLocation.update({
        where: { id: locationId },
        data: { isActive: false },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.RENTAL_LOCATION_DEACTIVATED,
        entityType: 'RentalLocation',
        entityId: locationId,
        before: { isActive: true },
        after: { isActive: false },
        reason,
      });
    });

    return { id: locationId, isActive: false };
  }

  async activateRentalLocation(
    tenantId: string,
    actorId: string,
    actorRole: string,
    locationId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const row = await this.assertRentalLocation(tenantId, locationId);
    if (row.isActive) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'El local ya está activo',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rentalLocation.update({
        where: { id: locationId },
        data: { isActive: true },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.RENTAL_LOCATION_ACTIVATED,
        entityType: 'RentalLocation',
        entityId: locationId,
        before: { isActive: false },
        after: { isActive: true },
        reason,
      });
    });

    return { id: locationId, isActive: true };
  }

  async deactivateExcursionOperator(
    tenantId: string,
    actorId: string,
    actorRole: string,
    operatorId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const row = await this.assertExcursionOperator(tenantId, operatorId);
    if (!row.isActive) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'El operador ya está dado de baja',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.excursionOperator.update({
        where: { id: operatorId },
        data: { isActive: false },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EXCURSION_OPERATOR_DEACTIVATED,
        entityType: 'ExcursionOperator',
        entityId: operatorId,
        before: { isActive: true },
        after: { isActive: false },
        reason,
      });
    });

    return { id: operatorId, isActive: false };
  }

  async activateExcursionOperator(
    tenantId: string,
    actorId: string,
    actorRole: string,
    operatorId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const row = await this.assertExcursionOperator(tenantId, operatorId);
    if (row.isActive) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'El operador ya está activo',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.excursionOperator.update({
        where: { id: operatorId },
        data: { isActive: true },
      });
      await this.writeAudit(tx, {
        tenantId,
        actorId,
        actorRole,
        action: AuditAction.EXCURSION_OPERATOR_ACTIVATED,
        entityType: 'ExcursionOperator',
        entityId: operatorId,
        before: { isActive: false },
        after: { isActive: true },
        reason,
      });
    });

    return { id: operatorId, isActive: true };
  }

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return event;
  }

  private async assertRentalLocation(tenantId: string, locationId: string) {
    const row = await this.prisma.rentalLocation.findFirst({
      where: { id: locationId, tenantId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Rental location not found',
      });
    }
    return row;
  }

  private async assertExcursionOperator(tenantId: string, operatorId: string) {
    const row = await this.prisma.excursionOperator.findFirst({
      where: { id: operatorId, tenantId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion operator not found',
      });
    }
    return row;
  }
}
