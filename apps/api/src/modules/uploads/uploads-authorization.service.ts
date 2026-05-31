import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ErrorCode,
  Role,
  type PublicImageUploadFields,
} from '@yo-te-invito/shared';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { PrismaService } from '../../prisma/prisma.service';

export type UploadAuthUser = {
  id: string;
  tenantId: string;
  role: string;
};

@Injectable()
export class UploadsAuthorizationService {
  constructor(
    private readonly profilesAuth: ProfilesAuthorizationService,
    private readonly prisma: PrismaService,
  ) {}

  async assertCanUploadPublicImage(
    user: UploadAuthUser,
    fields: PublicImageUploadFields,
  ): Promise<void> {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (fields.scope === 'platform') {
      throw this.forbidden('Platform uploads require ADMIN role');
    }

    if (fields.scope === 'rental') {
      throw this.forbidden(
        'Rental uploads require ADMIN role (no rental owner portal in V1)',
      );
    }

    if (!fields.entityId?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'entityId is required for this upload scope',
      });
    }

    const hasProducer = await this.profilesAuth.hasProducerAccess(user.tenantId, user.id);
    const hasGastro = await this.profilesAuth.hasGastroAccess(user.tenantId, user.id);
    const hasHotel = await this.profilesAuth.hasHotelAccess(user.tenantId, user.id);

    switch (fields.scope) {
      case 'producer':
      case 'event':
      case 'excursion':
        if (!hasProducer) {
          throw this.forbidden('Producer access required for this upload scope');
        }
        await this.assertProducerScope(user, fields);
        return;
      case 'gastro':
        if (!hasGastro) {
          throw this.forbidden('Gastro access required for this upload scope');
        }
        await this.assertOwnedGastroProfile(user, fields.entityId);
        return;
      case 'hotel':
        if (!hasHotel) {
          throw this.forbidden('Hotel access required for this upload scope');
        }
        await this.assertOwnedHotelProfile(user, fields.entityId);
        return;
      default:
        throw this.forbidden(`Upload scope "${fields.scope}" is not allowed`);
    }
  }

  private async assertProducerScope(
    user: UploadAuthUser,
    fields: PublicImageUploadFields,
  ): Promise<void> {
    const entityId = fields.entityId!;

    switch (fields.scope) {
      case 'producer': {
        const ok = await this.profilesAuth.canManageProducerProfile(
          user.tenantId,
          user.id,
          entityId,
        );
        if (!ok) {
          throw this.forbidden('Not allowed to upload for this producer profile');
        }
        return;
      }
      case 'event': {
        await this.assertProducerOwnsEvent(user, entityId);
        return;
      }
      case 'excursion': {
        await this.assertProducerOwnsExcursionEntity(user, entityId);
        return;
      }
      default:
        throw this.forbidden(`Producer cannot upload scope "${fields.scope}"`);
    }
  }

  private async assertProducerOwnsEvent(
    user: UploadAuthUser,
    eventId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, producerId: true, producerProfileId: true, category: true },
    });
    if (!event) {
      throw this.forbidden('Not allowed to upload for this event');
    }

    const ok = await this.profilesAuth.canManageEvent(user.tenantId, user.id, event);
    if (!ok) {
      throw this.forbidden('Not allowed to upload for this event');
    }
  }

  /**
   * entityId may be an excursion Event id (category=excursion).
   * ExcursionOperator ids are admin-only (no producer ownership model).
   */
  private async assertProducerOwnsExcursionEntity(
    user: UploadAuthUser,
    entityId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: entityId,
        tenantId: user.tenantId,
        deletedAt: null,
        category: 'excursion',
      },
      select: { id: true, producerId: true, producerProfileId: true },
    });

    if (event) {
      const ok = await this.profilesAuth.canManageEvent(user.tenantId, user.id, event);
      if (!ok) {
        throw this.forbidden('Not allowed to upload for this excursion');
      }
      return;
    }

    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: entityId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (operator) {
      throw this.forbidden(
        'Excursion operator uploads require ADMIN; use the excursion event id when editing owned excursions',
      );
    }

    throw this.forbidden('Not allowed to upload for this excursion entity');
  }

  private async assertOwnedGastroProfile(
    user: UploadAuthUser,
    gastroProfileId: string,
  ): Promise<void> {
    const ok = await this.profilesAuth.canManageGastroProfile(
      user.tenantId,
      user.id,
      gastroProfileId,
    );
    if (!ok) {
      throw this.forbidden('Not allowed to upload for this gastro profile');
    }
  }

  private async assertOwnedHotelProfile(
    user: UploadAuthUser,
    hotelProfileId: string,
  ): Promise<void> {
    const ok = await this.profilesAuth.canManageHotelProfile(
      user.tenantId,
      user.id,
      hotelProfileId,
    );
    if (!ok) {
      throw this.forbidden('Not allowed to upload for this hotel profile');
    }
  }

  private forbidden(message: string): ForbiddenException {
    return new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message,
    });
  }
}
