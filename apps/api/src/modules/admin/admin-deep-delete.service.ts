import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, ProfileStatus } from '@prisma/client';
import type {
  AdminDeepDeleteBody,
  AdminDeepDeleteEntityType,
  AdminDeepDeletePreflight,
  AdminDeepDeleteResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminUsersService } from './admin-users.service';
import { buildDeepDeletePreflight } from './admin-deep-delete-preflight.util';

const CONFIRM_WORD = 'ELIMINAR';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class AdminDeepDeleteService {
  private readonly logger = new Logger(AdminDeepDeleteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly adminUsers: AdminUsersService,
  ) {}

  getPreflight(
    tenantId: string,
    entityType: AdminDeepDeleteEntityType,
    entityId: string,
    actorUserId: string,
  ): Promise<AdminDeepDeletePreflight> {
    return buildDeepDeletePreflight(this.prisma, tenantId, entityType, entityId, actorUserId);
  }

  async execute(
    tenantId: string,
    actor: { id: string; role: string },
    entityType: AdminDeepDeleteEntityType,
    entityId: string,
    body: AdminDeepDeleteBody,
  ): Promise<AdminDeepDeleteResponse> {
    const preflight = await this.getPreflight(tenantId, entityType, entityId, actor.id);
    this.assertCanExecute(preflight, body);

    let mode: 'hard' | 'soft' = 'soft';

    try {
      switch (entityType) {
        case 'USER':
          mode = await this.executeUser(tenantId, actor, entityId, preflight);
          break;
        case 'GASTRO':
          mode = await this.executeGastro(tenantId, actor, entityId, preflight);
          break;
        case 'PRODUCER':
          mode = await this.executeProducer(tenantId, actor, entityId, preflight);
          break;
        case 'HOTEL':
          mode = await this.executeHotel(tenantId, actor, entityId, preflight);
          break;
        case 'EVENT':
          await this.executeEvent(tenantId, actor, entityId, preflight);
          mode = 'soft';
          break;
        case 'RENTAL_LOCATION':
          await this.executeRentalLocation(tenantId, actor, entityId, preflight);
          mode = 'soft';
          break;
        case 'EXCURSION_OPERATOR':
          await this.executeExcursionOperator(tenantId, actor, entityId, preflight);
          mode = 'soft';
          break;
        default:
          throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Unknown entity type' });
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Deep delete failed entityType=${entityType} entityId=${entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.ADMIN_DEEP_DELETE_EXECUTED,
      entityType,
      entityId,
      before: { entityLabel: preflight.entityLabel },
      after: { deleted: true, mode },
      metadata: {
        force: body.force ?? false,
        acknowledgedCriticalHistory: body.acknowledgedCriticalHistory ?? false,
        preflightSnapshot: preflight,
        deletedAt: new Date().toISOString(),
      },
    });

    return { entityType, entityId, deleted: true, mode };
  }

  private assertCanExecute(preflight: AdminDeepDeletePreflight, body: AdminDeepDeleteBody) {
    if (body.confirmationText.trim().toUpperCase() !== CONFIRM_WORD) {
      throw new BadRequestException({
        code: ErrorCode.ADMIN_DEEP_DELETE_CONFIRMATION_REQUIRED,
        message: `Debés escribir ${CONFIRM_WORD} para confirmar.`,
      });
    }

    if (!preflight.canDelete) {
      void this.logBlocked(preflight);
      throw new ConflictException({
        code: ErrorCode.ADMIN_DEEP_DELETE_BLOCKED,
        message: 'No se puede eliminar esta entidad por restricciones de política.',
        impacts: preflight.impacts.filter((i) => i.severity === 'blocker'),
      });
    }

    if (preflight.requiresForce && !body.force) {
      throw new ConflictException({
        code: ErrorCode.ADMIN_DEEP_DELETE_BLOCKED,
        message: 'Esta entidad tiene contenido asociado. Confirmá con force: true.',
      });
    }

    if (preflight.requiresExtraConfirmation && !body.acknowledgedCriticalHistory) {
      throw new ConflictException({
        code: ErrorCode.ADMIN_DEEP_DELETE_BLOCKED,
        message: 'Debés confirmar que entendés el historial crítico asociado.',
      });
    }
  }

  private async logBlocked(preflight: AdminDeepDeletePreflight) {
    // Best-effort; actor may be unknown in some edge cases
  }

  private async purgeEventShellInTx(tx: Tx, eventId: string, withMedia = true) {
    if (withMedia) {
      await tx.eventSubcategory.deleteMany({ where: { eventId } });
      await tx.eventTag.deleteMany({ where: { eventId } });
      await tx.eventMedia.deleteMany({ where: { eventId } });
      await tx.eventOccurrence.deleteMany({ where: { eventId } });
      await tx.categoryBannerItem.deleteMany({ where: { eventId } });
      await tx.gastroContent.deleteMany({ where: { eventId } });
      const ticketCount = await tx.ticket.count({ where: { eventId } });
      if (ticketCount === 0) {
        await tx.ticketType.deleteMany({ where: { eventId } });
      }
    }
    await tx.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }

  private async executeUser(
    tenantId: string,
    actor: { id: string; role: string },
    userId: string,
    preflight: AdminDeepDeletePreflight,
  ): Promise<'hard' | 'soft'> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }

    const hasCritical = preflight.summary.criticalCount > 0;

    await this.prisma.$transaction(async (tx) => {
      const events = await tx.event.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [{ producerId: userId }, { producerProfile: { memberships: { some: { userId } } } }],
        },
        select: { id: true },
      });
      for (const { id } of events) {
        await this.purgeEventShellInTx(tx, id);
      }

      const gastroProfiles = await tx.gastroProfile.findMany({
        where: { memberships: { some: { userId } } },
        select: { id: true },
      });
      for (const { id } of gastroProfiles) {
        await this.suspendGastroInTx(tx, tenantId, id);
      }

      const hotelProfiles = await tx.hotelProfile.findMany({
        where: { memberships: { some: { userId } } },
        select: { id: true, publicEventId: true },
      });
      for (const hotel of hotelProfiles) {
        if (hotel.publicEventId) {
          await this.purgeEventShellInTx(tx, hotel.publicEventId);
        }
        await tx.hotelProfile.update({
          where: { id: hotel.id },
          data: { status: ProfileStatus.SUSPENDED },
        });
      }

      await this.adminUsers.cleanupAuxiliaryUserDataForDeepDelete(tx, tenantId, userId);

      if (hasCritical) {
        await tx.user.update({
          where: { id: userId },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            email: `deleted+${userId}@removed.local`,
            firstName: 'Usuario',
            lastName: 'Eliminado',
            phone: null,
          },
        });
      } else {
        await tx.user.delete({ where: { id: userId } });
      }
    });

    return hasCritical ? 'soft' : 'hard';
  }

  private async suspendGastroInTx(tx: Tx, tenantId: string, profileId: string) {
    const profile = await tx.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
      select: { publicEventId: true },
    });
    if (!profile) return;

    await tx.gastroDiscountClaim.deleteMany({
      where: { discount: { gastroProfileId: profileId }, status: 'ACTIVE' },
    });
    await tx.gastroDiscount.updateMany({
      where: { gastroProfileId: profileId },
      data: { status: 'CANCELLED' },
    });
    await tx.gastroContent.deleteMany({ where: { gastroProfileId: profileId } });
    await tx.userGastroFollow.deleteMany({ where: { gastroProfileId: profileId } });
    await tx.scannerAccount.updateMany({
      where: { tenantId, parentProfileType: 'GASTRO', parentProfileId: profileId },
      data: { isActive: false },
    });

    if (profile.publicEventId) {
      await this.purgeEventShellInTx(tx, profile.publicEventId);
    }

    const usedClaims = await tx.gastroDiscountClaim.count({
      where: { discount: { gastroProfileId: profileId }, status: 'USED' },
    });
    const validations = await tx.gastroDiscountValidation.count({
      where: { discount: { gastroProfileId: profileId } },
    });

    if (usedClaims + validations === 0) {
      const discounts = await tx.gastroDiscount.findMany({
        where: { gastroProfileId: profileId },
        select: { id: true },
      });
      for (const d of discounts) {
        await tx.gastroDiscount.delete({ where: { id: d.id } }).catch(() => undefined);
      }
      await tx.gastroProfile.delete({ where: { id: profileId } }).catch(() => undefined);
    } else {
      await tx.gastroProfile.update({
        where: { id: profileId },
        data: { status: ProfileStatus.SUSPENDED, publicEventId: null },
      });
    }
  }

  private async executeGastro(
    tenantId: string,
    _actor: { id: string; role: string },
    profileId: string,
    _preflight: AdminDeepDeletePreflight,
  ): Promise<'hard' | 'soft'> {
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!profile) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Gastro profile not found' });
    }

    let hard = false;
    await this.prisma.$transaction(async (tx) => {
      const usedClaims = await tx.gastroDiscountClaim.count({
        where: { discount: { gastroProfileId: profileId }, status: 'USED' },
      });
      const validations = await tx.gastroDiscountValidation.count({
        where: { discount: { gastroProfileId: profileId } },
      });
      hard = usedClaims + validations === 0;
      await this.suspendGastroInTx(tx, tenantId, profileId);
    });

    return hard ? 'hard' : 'soft';
  }

  private async executeProducer(
    tenantId: string,
    _actor: { id: string; role: string },
    profileId: string,
    preflight: AdminDeepDeletePreflight,
  ): Promise<'hard' | 'soft'> {
    const profile = await this.prisma.producerProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!profile) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Producer profile not found' });
    }

    const hasCritical = preflight.summary.criticalCount > 0;

    await this.prisma.$transaction(async (tx) => {
      const events = await tx.event.findMany({
        where: { tenantId, producerProfileId: profileId, deletedAt: null },
        select: { id: true },
      });
      for (const { id } of events) {
        await this.purgeEventShellInTx(tx, id);
      }

      await tx.scannerAccount.updateMany({
        where: { tenantId, parentProfileType: 'PRODUCER', parentProfileId: profileId },
        data: { isActive: false },
      });

      if (hasCritical) {
        await tx.producerProfile.update({
          where: { id: profileId },
          data: { status: ProfileStatus.SUSPENDED },
        });
      } else {
        await tx.userProducerMembership.deleteMany({ where: { profileId } });
        await tx.producerProfile.delete({ where: { id: profileId } });
      }
    });

    return hasCritical ? 'soft' : 'hard';
  }

  private async executeHotel(
    tenantId: string,
    _actor: { id: string; role: string },
    profileId: string,
    _preflight: AdminDeepDeletePreflight,
  ): Promise<'hard' | 'soft'> {
    const profile = await this.prisma.hotelProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!profile) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Hotel profile not found' });
    }

    await this.prisma.$transaction(async (tx) => {
      if (profile.publicEventId) {
        await this.purgeEventShellInTx(tx, profile.publicEventId);
      }
      await tx.hotelProfile.update({
        where: { id: profileId },
        data: { status: ProfileStatus.SUSPENDED, publicEventId: null },
      });
    });

    return 'soft';
  }

  private async executeEvent(
    tenantId: string,
    _actor: { id: string; role: string },
    eventId: string,
    _preflight: AdminDeepDeletePreflight,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gastroDiscount.updateMany({
        where: { eventId },
        data: { status: 'CANCELLED' },
      });
      await this.purgeEventShellInTx(tx, eventId);
    });
  }

  private async executeRentalLocation(
    tenantId: string,
    _actor: { id: string; role: string },
    locationId: string,
    _preflight: AdminDeepDeletePreflight,
  ) {
    const location = await this.prisma.rentalLocation.findFirst({
      where: { id: locationId, tenantId, deletedAt: null },
    });
    if (!location) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Rental location not found' });
    }

    await this.prisma.$transaction(async (tx) => {
      const products = await tx.event.findMany({
        where: { rentalLocationId: locationId, tenantId, deletedAt: null },
        select: { id: true },
      });
      for (const { id } of products) {
        await this.purgeEventShellInTx(tx, id);
      }
      await tx.rentalLocation.update({
        where: { id: locationId },
        data: { deletedAt: new Date(), isActive: false },
      });
    });
  }

  private async executeExcursionOperator(
    tenantId: string,
    _actor: { id: string; role: string },
    operatorId: string,
    _preflight: AdminDeepDeletePreflight,
  ) {
    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: operatorId, tenantId, deletedAt: null },
    });
    if (!operator) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Excursion operator not found',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const excursions = await tx.event.findMany({
        where: { excursionOperatorId: operatorId, tenantId, deletedAt: null },
        select: { id: true },
      });
      for (const { id } of excursions) {
        await this.purgeEventShellInTx(tx, id);
      }
      await tx.excursionOperator.update({
        where: { id: operatorId },
        data: { deletedAt: new Date(), isActive: false },
      });
    });
  }
}
