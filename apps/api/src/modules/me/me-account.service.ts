import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ChangePasswordBody,
  ChangePasswordResponse,
  MeAccount,
  PatchMeAccountBody,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

@Injectable()
export class MeAccountService {
  constructor(private readonly prisma: PrismaService) {}

  private readAccountFields(preferences: unknown): {
    city: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
  } {
    const p = (preferences as Record<string, unknown> | null) ?? {};
    return {
      city: typeof p.city === 'string' ? p.city : null,
      avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : null,
      dateOfBirth: typeof p.dateOfBirth === 'string' ? p.dateOfBirth : null,
    };
  }

  async getAccount(tenantId: string, userId: string): Promise<MeAccount> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferences: true,
      },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }
    const extra = this.readAccountFields(user.preferences);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      city: extra.city,
      avatarUrl: extra.avatarUrl,
      dateOfBirth: extra.dateOfBirth,
    };
  }

  async patchAccount(
    tenantId: string,
    userId: string,
    body: PatchMeAccountBody,
  ): Promise<MeAccount> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { preferences: true },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }

    const prev = (user.preferences as Record<string, unknown> | null) ?? {};
    const nextPrefs = { ...prev };
    if (body.city !== undefined) {
      nextPrefs.city = body.city;
      nextPrefs.preferredCity = body.city;
      nextPrefs.preferredCities = body.city ? [body.city] : [];
    }
    if (body.avatarUrl !== undefined) nextPrefs.avatarUrl = body.avatarUrl;
    if (body.dateOfBirth !== undefined) nextPrefs.dateOfBirth = body.dateOfBirth;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        preferences: nextPrefs as Prisma.InputJsonValue,
      },
    });

    return this.getAccount(tenantId, userId);
  }

  async changePassword(
    tenantId: string,
    userId: string,
    body: ChangePasswordBody,
  ): Promise<ChangePasswordResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Password login is not configured for this account',
      });
    }
    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Current password is incorrect',
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(body.newPassword) },
    });
    return { message: 'Password updated' };
  }
}
