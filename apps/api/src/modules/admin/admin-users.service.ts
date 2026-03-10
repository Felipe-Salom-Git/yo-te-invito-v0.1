import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminUsersListQuery,
  AdminCreateReferrerBody,
  AdminUpdateRoleBody,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { Role } from '@yo-te-invito/shared';
import type { Role as PrismaRole } from '@prisma/client';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    query: AdminUsersListQuery,
  ): Promise<{ users: Array<{ id: string; tenantId: string; email: string; role: string; firstName: string; lastName: string }> }> {
    const where: { tenantId: string; role?: PrismaRole; deletedAt: null } = {
      tenantId,
      deletedAt: null,
    };
    if (query.role) where.role = query.role as PrismaRole;

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      users: users.map((u) => ({
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: body.role as Role },
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
