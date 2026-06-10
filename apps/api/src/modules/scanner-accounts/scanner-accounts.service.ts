import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  Role as PrismaRole,
  ScannerParentProfileType,
  UserStatus,
} from '@prisma/client';
import {
  ErrorCode,
  Role,
  type AdminScannerAccountsListQuery,
  type CreateScannerUserBody,
  type CreateScannerUserResponse,
  type LinkScannerAccountBody,
  type ResetScannerPasswordBody,
  type ResetScannerPasswordResponse,
  type ScannerAccountSelfResponse,
  type ScannerAccountSummary,
  type ScannerAccountsListResponse,
  type ScannerParentProfileType as SharedScannerParentProfileType,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { AuditService } from '../audit/audit.service';
import { generateTemporaryPassword, hashPassword } from '../../common/password.util';

type AuthUser = { id: string; tenantId: string; role: string };

@Injectable()
export class ScannerAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly audit: AuditService,
  ) {}

  private mapRow(
    row: Prisma.ScannerAccountGetPayload<{
      include: {
        scannerUser: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
            status: true;
            role: true;
          };
        };
      };
    }>,
  ): ScannerAccountSummary {
    return {
      id: row.id,
      scannerUserId: row.scannerUserId,
      email: row.scannerUser.email,
      firstName: row.scannerUser.firstName,
      lastName: row.scannerUser.lastName,
      userStatus: row.scannerUser.status,
      isActive: row.isActive,
      parentProfileType: row.parentProfileType,
      parentProfileId: row.parentProfileId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async listRows(where: Prisma.ScannerAccountWhereInput): Promise<ScannerAccountsListResponse> {
    const rows = await this.prisma.scannerAccount.findMany({
      where,
      include: {
        scannerUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: rows
        .filter((r) => r.scannerUser.deletedAt == null && r.scannerUser.role === PrismaRole.SCANNER)
        .map((r) => this.mapRow(r)),
    };
  }

  async assertParentProfileAccess(
    tenantId: string,
    userId: string,
    userRole: string,
    parentProfileType: ScannerParentProfileType,
    parentProfileId: string,
  ): Promise<void> {
    if (userRole === Role.ADMIN) return;

    switch (parentProfileType) {
      case ScannerParentProfileType.PRODUCER: {
        const ok = await this.profiles.canManageProducerProfile(tenantId, userId, parentProfileId);
        if (!ok) throw this.forbiddenParent();
        return;
      }
      case ScannerParentProfileType.GASTRO: {
        const ok = await this.profiles.canManageGastroProfile(tenantId, userId, parentProfileId);
        if (!ok) throw this.forbiddenParent();
        return;
      }
      case ScannerParentProfileType.EXCURSION_OPERATOR:
      case ScannerParentProfileType.RENTAL_LOCATION:
        throw this.forbiddenParent();
      default:
        throw this.forbiddenParent();
    }
  }

  private forbiddenParent(): ForbiddenException {
    return new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message: 'No tenés permiso para gestionar scanners de esta cuenta',
    });
  }

  private async assertParentProfileExists(
    tenantId: string,
    parentProfileType: ScannerParentProfileType,
    parentProfileId: string,
  ): Promise<void> {
    let found = false;
    switch (parentProfileType) {
      case ScannerParentProfileType.PRODUCER:
        found = !!(await this.prisma.producerProfile.findFirst({
          where: { id: parentProfileId, tenantId, status: 'ACTIVE' },
          select: { id: true },
        }));
        break;
      case ScannerParentProfileType.GASTRO:
        found = !!(await this.prisma.gastroProfile.findFirst({
          where: { id: parentProfileId, tenantId, status: 'ACTIVE' },
          select: { id: true },
        }));
        break;
      case ScannerParentProfileType.EXCURSION_OPERATOR:
        found = !!(await this.prisma.excursionOperator.findFirst({
          where: { id: parentProfileId, tenantId, isActive: true, deletedAt: null },
          select: { id: true },
        }));
        break;
      case ScannerParentProfileType.RENTAL_LOCATION:
        found = !!(await this.prisma.rentalLocation.findFirst({
          where: { id: parentProfileId, tenantId, isActive: true, deletedAt: null },
          select: { id: true },
        }));
        break;
    }
    if (!found) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Parent profile not found or inactive',
      });
    }
  }

  private async getManagedProducerProfileIds(tenantId: string, userId: string): Promise<string[]> {
    const memberships = await this.prisma.userProducerMembership.findMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      select: { profileId: true },
    });
    return memberships.map((m) => m.profileId);
  }

  private async getManagedGastroProfileIds(tenantId: string, userId: string): Promise<string[]> {
    const memberships = await this.prisma.userGastroMembership.findMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      select: { profileId: true },
    });
    return memberships.map((m) => m.profileId);
  }

  async listForProducer(user: AuthUser): Promise<ScannerAccountsListResponse> {
    if (user.role !== Role.ADMIN && !(await this.profiles.hasProducerAccess(user.tenantId, user.id))) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }

    const profileIds = await this.getManagedProducerProfileIds(user.tenantId, user.id);
    if (profileIds.length === 0 && user.role !== Role.ADMIN) {
      return { data: [] };
    }

    return this.listRows({
      tenantId: user.tenantId,
      parentProfileType: ScannerParentProfileType.PRODUCER,
      ...(user.role === Role.ADMIN ? {} : { parentProfileId: { in: profileIds } }),
    });
  }

  private async resolveParentProfileId(
    tenantId: string,
    userId: string,
    userRole: string,
    parentProfileType: ScannerParentProfileType,
    explicitId?: string,
  ): Promise<string> {
    const ids =
      parentProfileType === ScannerParentProfileType.PRODUCER
        ? await this.getManagedProducerProfileIds(tenantId, userId)
        : await this.getManagedGastroProfileIds(tenantId, userId);

    if (explicitId?.trim()) {
      const id = explicitId.trim();
      if (userRole !== Role.ADMIN && !ids.includes(id)) {
        throw this.forbiddenParent();
      }
      return id;
    }

    if (userRole === Role.ADMIN) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'parentProfileId is required for admin create',
      });
    }

    if (ids.length === 1) return ids[0]!;
    if (ids.length === 0) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No active parent profile found',
      });
    }

    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'parentProfileId is required when managing multiple profiles',
    });
  }

  private async getAccountForParentManagement(
    tenantId: string,
    userId: string,
    userRole: string,
    accountId: string,
    expectedType: ScannerParentProfileType,
  ) {
    const row = await this.prisma.scannerAccount.findFirst({
      where: { id: accountId, tenantId, parentProfileType: expectedType },
      include: {
        scannerUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Scanner account not found',
      });
    }
    await this.assertParentProfileAccess(
      tenantId,
      userId,
      userRole,
      expectedType,
      row.parentProfileId,
    );
    return row;
  }

  private async createScannerForParent(
    actor: AuthUser,
    parentProfileType: ScannerParentProfileType,
    body: CreateScannerUserBody,
  ): Promise<CreateScannerUserResponse> {
    if (actor.role === Role.SCANNER) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Scanner users cannot create other scanners',
      });
    }

    const parentProfileId = await this.resolveParentProfileId(
      actor.tenantId,
      actor.id,
      actor.role,
      parentProfileType,
      body.parentProfileId,
    );
    await this.assertParentProfileAccess(
      actor.tenantId,
      actor.id,
      actor.role,
      parentProfileType,
      parentProfileId,
    );
    await this.assertParentProfileExists(actor.tenantId, parentProfileType, parentProfileId);

    const email = body.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: actor.tenantId, email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_ALREADY_EXISTS,
        message: 'Ya existe un usuario con este email',
      });
    }

    let temporaryPassword: string | undefined;
    const plainPassword = body.password ?? (temporaryPassword = generateTemporaryPassword());

    const row = await this.prisma.$transaction(async (tx) => {
      const scannerUser = await tx.user.create({
        data: {
          tenantId: actor.tenantId,
          email,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: PrismaRole.SCANNER,
          status: UserStatus.ACTIVE,
          passwordHash: hashPassword(plainPassword),
        },
      });

      return tx.scannerAccount.create({
        data: {
          tenantId: actor.tenantId,
          scannerUserId: scannerUser.id,
          parentUserId: actor.id,
          parentProfileType,
          parentProfileId,
        },
        include: {
          scannerUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
              role: true,
            },
          },
        },
      });
    });

    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.SCANNER_ACCOUNT_LINKED,
      entityType: 'ScannerAccount',
      entityId: row.id,
      after: {
        scannerUserId: row.scannerUserId,
        parentProfileType: row.parentProfileType,
        parentProfileId: row.parentProfileId,
        source: 'portal_create',
      },
    });

    return {
      ...this.mapRow(row),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  }

  async createForProducer(
    actor: AuthUser,
    body: CreateScannerUserBody,
  ): Promise<CreateScannerUserResponse> {
    if (
      actor.role !== Role.ADMIN &&
      !(await this.profiles.hasProducerAccess(actor.tenantId, actor.id))
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }
    return this.createScannerForParent(actor, ScannerParentProfileType.PRODUCER, body);
  }

  async createForGastro(
    actor: AuthUser,
    body: CreateScannerUserBody,
  ): Promise<CreateScannerUserResponse> {
    if (
      actor.role !== Role.ADMIN &&
      !(await this.profiles.hasGastroAccess(actor.tenantId, actor.id))
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }
    return this.createScannerForParent(actor, ScannerParentProfileType.GASTRO, body);
  }

  private async setAccountActive(
    actor: AuthUser,
    accountId: string,
    expectedType: ScannerParentProfileType,
    isActive: boolean,
  ): Promise<ScannerAccountSummary> {
    const row = await this.getAccountForParentManagement(
      actor.tenantId,
      actor.id,
      actor.role,
      accountId,
      expectedType,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const account = await tx.scannerAccount.update({
        where: { id: row.id },
        data: { isActive },
        include: {
          scannerUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
              role: true,
            },
          },
        },
      });

      await tx.user.update({
        where: { id: row.scannerUserId },
        data: { status: isActive ? UserStatus.ACTIVE : UserStatus.SUSPENDED },
      });

      return account;
    });

    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: isActive
        ? AuditAction.SCANNER_ACCOUNT_ACTIVATED
        : AuditAction.SCANNER_ACCOUNT_DEACTIVATED,
      entityType: 'ScannerAccount',
      entityId: updated.id,
      before: { isActive: row.isActive, userStatus: row.scannerUser.status },
      after: { isActive: updated.isActive, userStatus: isActive ? 'ACTIVE' : 'SUSPENDED' },
    });

    return this.mapRow(updated);
  }

  async updateProducerAccountStatus(
    actor: AuthUser,
    accountId: string,
    isActive: boolean,
  ): Promise<ScannerAccountSummary> {
    return this.setAccountActive(
      actor,
      accountId,
      ScannerParentProfileType.PRODUCER,
      isActive,
    );
  }

  async updateGastroAccountStatus(
    actor: AuthUser,
    accountId: string,
    isActive: boolean,
  ): Promise<ScannerAccountSummary> {
    return this.setAccountActive(actor, accountId, ScannerParentProfileType.GASTRO, isActive);
  }

  async resetProducerPassword(
    actor: AuthUser,
    accountId: string,
    body: ResetScannerPasswordBody,
  ): Promise<ResetScannerPasswordResponse> {
    return this.resetPasswordForParent(
      actor,
      accountId,
      ScannerParentProfileType.PRODUCER,
      body,
    );
  }

  async resetGastroPassword(
    actor: AuthUser,
    accountId: string,
    body: ResetScannerPasswordBody,
  ): Promise<ResetScannerPasswordResponse> {
    return this.resetPasswordForParent(actor, accountId, ScannerParentProfileType.GASTRO, body);
  }

  private async resetPasswordForParent(
    actor: AuthUser,
    accountId: string,
    expectedType: ScannerParentProfileType,
    body: ResetScannerPasswordBody,
  ): Promise<ResetScannerPasswordResponse> {
    const row = await this.getAccountForParentManagement(
      actor.tenantId,
      actor.id,
      actor.role,
      accountId,
      expectedType,
    );

    let temporaryPassword: string | undefined;
    const plainPassword = body.password ?? (temporaryPassword = generateTemporaryPassword());

    await this.prisma.user.update({
      where: { id: row.scannerUserId },
      data: { passwordHash: hashPassword(plainPassword) },
    });

    const refreshed = await this.prisma.scannerAccount.findUniqueOrThrow({
      where: { id: row.id },
      include: {
        scannerUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
          },
        },
      },
    });

    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.SCANNER_PASSWORD_RESET,
      entityType: 'ScannerAccount',
      entityId: row.id,
      metadata: { scannerUserId: row.scannerUserId },
    });

    return {
      account: this.mapRow(refreshed),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  }

  async listForGastro(user: AuthUser): Promise<ScannerAccountsListResponse> {
    if (user.role !== Role.ADMIN && !(await this.profiles.hasGastroAccess(user.tenantId, user.id))) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }

    const profileIds = await this.getManagedGastroProfileIds(user.tenantId, user.id);
    if (profileIds.length === 0 && user.role !== Role.ADMIN) {
      return { data: [] };
    }

    return this.listRows({
      tenantId: user.tenantId,
      parentProfileType: ScannerParentProfileType.GASTRO,
      ...(user.role === Role.ADMIN ? {} : { parentProfileId: { in: profileIds } }),
    });
  }

  async listForAdmin(
    tenantId: string,
    query: AdminScannerAccountsListQuery,
  ): Promise<ScannerAccountsListResponse> {
    const where: Prisma.ScannerAccountWhereInput = { tenantId };
    if (query.parentProfileType) where.parentProfileType = query.parentProfileType;
    if (query.parentProfileId) where.parentProfileId = query.parentProfileId;
    return this.listRows(where);
  }

  async getSelfForScanner(user: AuthUser): Promise<ScannerAccountSelfResponse | null> {
    if (user.role !== Role.SCANNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Scanner account required',
      });
    }

    const row = await this.prisma.scannerAccount.findFirst({
      where: { tenantId: user.tenantId, scannerUserId: user.id },
    });
    if (!row) return null;

    const parentDisplayName = await this.resolveParentDisplayName(
      user.tenantId,
      row.parentProfileType,
      row.parentProfileId,
    );

    return {
      id: row.id,
      tenantId: row.tenantId,
      parentProfileType: row.parentProfileType,
      parentProfileId: row.parentProfileId,
      parentDisplayName,
      isActive: row.isActive,
    };
  }

  private async resolveParentDisplayName(
    tenantId: string,
    type: ScannerParentProfileType,
    profileId: string,
  ): Promise<string | null> {
    switch (type) {
      case ScannerParentProfileType.PRODUCER: {
        const p = await this.prisma.producerProfile.findFirst({
          where: { id: profileId, tenantId },
          select: { displayName: true },
        });
        return p?.displayName ?? null;
      }
      case ScannerParentProfileType.GASTRO: {
        const p = await this.prisma.gastroProfile.findFirst({
          where: { id: profileId, tenantId },
          select: { displayName: true },
        });
        return p?.displayName ?? null;
      }
      case ScannerParentProfileType.EXCURSION_OPERATOR: {
        const p = await this.prisma.excursionOperator.findFirst({
          where: { id: profileId, tenantId },
          select: { name: true },
        });
        return p?.name ?? null;
      }
      case ScannerParentProfileType.RENTAL_LOCATION: {
        const p = await this.prisma.rentalLocation.findFirst({
          where: { id: profileId, tenantId },
          select: { name: true },
        });
        return p?.name ?? null;
      }
      default:
        return null;
    }
  }

  async linkScannerAccountAdmin(
    actor: AuthUser,
    body: LinkScannerAccountBody,
  ): Promise<ScannerAccountSummary> {
    const parentType = body.parentProfileType as ScannerParentProfileType;
    await this.assertParentProfileExists(actor.tenantId, parentType, body.parentProfileId);

    const scannerUser = await this.prisma.user.findFirst({
      where: {
        id: body.scannerUserId,
        tenantId: actor.tenantId,
        deletedAt: null,
      },
    });
    if (!scannerUser) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Scanner user not found',
      });
    }
    if (scannerUser.role !== PrismaRole.SCANNER) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'User must have SCANNER role',
      });
    }
    if (scannerUser.status !== UserStatus.ACTIVE) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Scanner user must be active',
      });
    }

    const existing = await this.prisma.scannerAccount.findUnique({
      where: { scannerUserId: body.scannerUserId },
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Scanner user is already linked to a parent account',
      });
    }

    const row = await this.prisma.scannerAccount.create({
      data: {
        tenantId: actor.tenantId,
        scannerUserId: body.scannerUserId,
        parentUserId: actor.id,
        parentProfileType: parentType,
        parentProfileId: body.parentProfileId,
      },
      include: {
        scannerUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
          },
        },
      },
    });

    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.SCANNER_ACCOUNT_LINKED,
      entityType: 'ScannerAccount',
      entityId: row.id,
      after: {
        scannerUserId: row.scannerUserId,
        parentProfileType: row.parentProfileType,
        parentProfileId: row.parentProfileId,
      },
    });

    return this.mapRow(row);
  }

  /** Used by scanner validation (Slice 5.7) — returns null if unlinked or inactive. */
  async getActiveAccountForScanner(
    tenantId: string,
    scannerUserId: string,
  ): Promise<{
    parentProfileType: SharedScannerParentProfileType;
    parentProfileId: string;
  } | null> {
    const row = await this.prisma.scannerAccount.findFirst({
      where: {
        tenantId,
        scannerUserId,
        isActive: true,
        scannerUser: { status: UserStatus.ACTIVE, role: PrismaRole.SCANNER, deletedAt: null },
      },
    });
    if (!row) return null;
    return {
      parentProfileType: row.parentProfileType,
      parentProfileId: row.parentProfileId,
    };
  }
}
