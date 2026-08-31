import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type {
  AdminUsersListQuery,
  AdminUsersListResponse,
  AdminUserListItem,
  AdminUserProfileSummary,
  AdminCreateReferrerBody,
  AdminUpdateRoleBody,
  AdminUserDeletePreflight,
  AdminUserDeleteResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { Role } from '@yo-te-invito/shared';
import type { Role as PrismaRole } from '@prisma/client';
import { buildAdminUsersWhere } from './admin-users-list.util';
import {
  buildAdminUserDeletePreflight,
  countUserDeleteDependencies,
  isProtectedMasterEmail,
} from './admin-user-delete.util';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function mapProfile(
  membership:
    | {
        profile: {
          id: string;
          displayName: string;
          status: string;
        };
      }
    | undefined,
): AdminUserProfileSummary | null {
  if (!membership?.profile) return null;
  return {
    id: membership.profile.id,
    displayName: membership.profile.displayName,
    status: membership.profile.status.toLowerCase(),
  };
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    tenantId: string,
    query: AdminUsersListQuery,
  ): Promise<AdminUsersListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildAdminUsersWhere(tenantId, query);

    const profileInclude = {
      take: 1,
      orderBy: { createdAt: 'desc' as const },
      include: {
        profile: {
          select: { id: true, displayName: true, status: true },
        },
      },
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          producerMemberships: profileInclude,
          gastroMemberships: profileInclude,
          hotelMemberships: profileInclude,
          referrerMemberships: profileInclude,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: AdminUserListItem[] = rows.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email ?? '',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified != null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      producerProfile: mapProfile(u.producerMemberships[0]),
      gastroProfile: mapProfile(u.gastroMemberships[0]),
      hotelProfile: mapProfile(u.hotelMemberships[0]),
      referrerProfile: mapProfile(u.referrerMemberships[0]),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateRole(
    tenantId: string,
    userId: string,
    body: AdminUpdateRoleBody,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
    if (isProtectedMasterEmail(user.email)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot change role of the master account',
      });
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: body.role as PrismaRole },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      email: updated.email,
      role: updated.role,
      firstName: updated.firstName,
      lastName: updated.lastName,
    };
  }

  async createReferrer(
    tenantId: string,
    body: AdminCreateReferrerBody,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: body.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'User with this email already exists',
      });
    }
    const password = body.password ?? crypto.randomBytes(12).toString('hex');
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'REFERRER',
        status: 'ACTIVE',
        passwordHash: hashPassword(password),
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    return user;
  }

  private async findActiveUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
    return user;
  }

  private async buildPolicyBlockers(
    tenantId: string,
    targetUser: { id: string; email: string | null; role: PrismaRole },
    actorUserId: string,
  ) {
    const blockers: AdminUserDeletePreflight['blockers'] = [];

    if (isProtectedMasterEmail(targetUser.email)) {
      blockers.push({
        type: 'PROTECTED_MASTER',
        count: 1,
        message: 'No se puede eliminar la cuenta maestro protegida.',
      });
    }

    if (actorUserId && targetUser.id === actorUserId) {
      blockers.push({
        type: 'SELF_DELETE',
        count: 1,
        message: 'No podés eliminar tu propia cuenta desde el panel de administración.',
      });
    }

    if (targetUser.role === Role.ADMIN) {
      try {
        const otherAdmins = await this.prisma.user.count({
          where: {
            tenantId,
            role: Role.ADMIN,
            deletedAt: null,
            id: { not: targetUser.id },
          },
        });
        if (otherAdmins === 0) {
          blockers.push({
            type: 'LAST_ADMIN',
            count: 1,
            message: 'No se puede eliminar el último administrador del tenant.',
          });
        }
      } catch (error) {
        this.logger.error(
          `Admin user delete preflight last-admin check failed for userId=${targetUser.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return blockers;
  }

  async getDeletePreflight(
    tenantId: string,
    userId: string,
    actorUserId: string,
  ): Promise<AdminUserDeletePreflight> {
    try {
      const user = await this.findActiveUser(tenantId, userId);
      const policyBlockers = await this.buildPolicyBlockers(
        tenantId,
        user,
        actorUserId?.trim() ?? '',
      );
      const counts = await countUserDeleteDependencies(this.prisma, tenantId, userId);
      return buildAdminUserDeletePreflight(counts, userId, policyBlockers);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Admin user delete preflight failed for userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async purgeOrphanCommercialProfiles(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
  ) {
    const [
      producerMemberships,
      gastroMemberships,
      hotelMemberships,
      referrerMemberships,
    ] = await Promise.all([
      tx.userProducerMembership.findMany({ where: { userId }, select: { profileId: true } }),
      tx.userGastroMembership.findMany({ where: { userId }, select: { profileId: true } }),
      tx.userHotelMembership.findMany({ where: { userId }, select: { profileId: true } }),
      tx.userReferrerMembership.findMany({ where: { userId }, select: { profileId: true } }),
    ]);

    for (const { profileId } of producerMemberships) {
      const [others, events] = await Promise.all([
        tx.userProducerMembership.count({ where: { profileId, userId: { not: userId } } }),
        tx.event.count({ where: { producerProfileId: profileId, deletedAt: null } }),
      ]);
      if (others === 0 && events === 0) {
        await tx.producerProfile.delete({ where: { id: profileId } }).catch(() => undefined);
      }
    }

    for (const { profileId } of gastroMemberships) {
      const [others, discounts, content, publicEvent] = await Promise.all([
        tx.userGastroMembership.count({ where: { profileId, userId: { not: userId } } }),
        tx.gastroDiscount.count({ where: { gastroProfileId: profileId } }),
        tx.gastroContent.count({ where: { gastroProfileId: profileId } }),
        tx.gastroProfile.count({ where: { id: profileId, publicEventId: { not: null } } }),
      ]);
      if (others === 0 && discounts === 0 && content === 0 && publicEvent === 0) {
        await tx.gastroProfile.delete({ where: { id: profileId } }).catch(() => undefined);
      }
    }

    for (const { profileId } of hotelMemberships) {
      const [others, publicEvent] = await Promise.all([
        tx.userHotelMembership.count({ where: { profileId, userId: { not: userId } } }),
        tx.hotelProfile.count({ where: { id: profileId, publicEventId: { not: null } } }),
      ]);
      if (others === 0 && publicEvent === 0) {
        await tx.hotelProfile.delete({ where: { id: profileId } }).catch(() => undefined);
      }
    }

    for (const { profileId } of referrerMemberships) {
      const [others, agreements, proposals, payments, assignments] = await Promise.all([
        tx.userReferrerMembership.count({ where: { profileId, userId: { not: userId } } }),
        tx.referralCommercialAgreement.count({ where: { referrerProfileId: profileId } }),
        tx.referralCommercialProposal.count({ where: { referrerProfileId: profileId } }),
        tx.referralPaymentRequest.count({ where: { referrerProfileId: profileId } }),
        tx.eventReferrerAssignment.count({ where: { referrerProfileId: profileId } }),
      ]);
      if (
        others === 0 &&
        agreements === 0 &&
        proposals === 0 &&
        payments === 0 &&
        assignments === 0
      ) {
        await tx.referrerProfile.delete({ where: { id: profileId } }).catch(() => undefined);
      }
    }
  }

  async cleanupAuxiliaryUserDataForDeepDelete(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    tenantId: string,
    userId: string,
  ) {
    await this.cleanupAuxiliaryUserData(tx, tenantId, userId);
  }

  private async cleanupAuxiliaryUserData(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    tenantId: string,
    userId: string,
  ) {
    await tx.ticket.updateMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { activeTransferOffer: { sellerUserId: userId } },
          { activeTransferOffer: { buyerUserId: userId } },
        ],
      },
      data: { activeTransferOfferId: null },
    });

    await tx.gastroDiscountClaim.deleteMany({ where: { tenantId, userId } });
    await tx.notificationDeliveryLog.deleteMany({ where: { userId } });
    await tx.userNotification.deleteMany({ where: { tenantId, userId } });
    await tx.userPushSubscription.deleteMany({ where: { tenantId, userId } });
    await tx.userFavorite.deleteMany({ where: { tenantId, userId } });
    await tx.userExpectedEvent.deleteMany({ where: { tenantId, userId } });
    await tx.userProducerFollow.deleteMany({ where: { tenantId, userId } });
    await tx.userGastroFollow.deleteMany({ where: { tenantId, userId } });
    await tx.userCartItem.deleteMany({ where: { cart: { tenantId, userId } } });
    await tx.userCart.deleteMany({ where: { tenantId, userId } });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });

    await this.purgeOrphanCommercialProfiles(tx, userId);
  }

  async deleteUser(
    tenantId: string,
    userId: string,
    actor: { id: string; role: string },
  ): Promise<AdminUserDeleteResponse> {
    const user = await this.findActiveUser(tenantId, userId);
    const preflight = await this.getDeletePreflight(tenantId, userId, actor.id);

    if (!preflight.canDelete) {
      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: AuditAction.ADMIN_USER_DELETE_BLOCKED,
        entityType: 'User',
        entityId: userId,
        before: {
          email: user.email,
          role: user.role,
        },
        metadata: {
          blockers: preflight.blockers,
        },
      });

      throw new ConflictException({
        code: ErrorCode.USER_DELETE_BLOCKED,
        message:
          'No se puede eliminar este usuario porque tiene publicaciones o historial asociado.',
        blockers: preflight.blockers,
      });
    }

    const deletedSnapshot = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    await this.prisma.$transaction(async (tx) => {
      await this.cleanupAuxiliaryUserData(tx, tenantId, userId);
      await tx.user.delete({ where: { id: userId } });
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.ADMIN_USER_DELETED,
      entityType: 'User',
      entityId: userId,
      before: deletedSnapshot,
      after: { deleted: true },
      metadata: {
        deletedUserId: user.id,
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
        actorUserId: actor.id,
        warnings: preflight.warnings,
      },
    });

    return { id: userId, deleted: true };
  }
}
