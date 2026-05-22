import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminUsersListQuery,
  AdminUsersListResponse,
  AdminUserListItem,
  AdminUserProfileSummary,
  AdminCreateReferrerBody,
  AdminUpdateRoleBody,
} from '@yo-te-invito/shared';
import { ErrorCode, MASTER_USER_EMAIL } from '@yo-te-invito/shared';
import { Role } from '@yo-te-invito/shared';
import type { Role as PrismaRole } from '@prisma/client';
import { buildAdminUsersWhere } from './admin-users-list.util';

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
  constructor(private readonly prisma: PrismaService) {}

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
      email: u.email,
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
    if (user.email.toLowerCase() === MASTER_USER_EMAIL.toLowerCase()) {
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
}
