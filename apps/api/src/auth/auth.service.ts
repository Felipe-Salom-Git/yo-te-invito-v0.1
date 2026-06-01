import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../email/email-queue.service';
import {
  buildWelcomeTemplateVariables,
  welcomeTemplateIdForProfile,
} from './auth-register-email.util';
import * as crypto from 'crypto';
import type {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  AuthApplyRoleRequest,
  AuthGoogleRequest,
  RegistrationProfileType,
} from '@yo-te-invito/shared';
import {
  AUTH_REGISTER_ERROR_CODES,
  LEGAL_SIGNUP_ERROR_CODES,
  LEGAL_SIGNUP_USER_MESSAGES,
} from '@yo-te-invito/shared';
import { LegalSignupService } from '../modules/legal/legal-signup.service';
import { ProfileRegistrationService } from './profile-registration.service';

export type RegisterRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const DEFAULT_TENANT_ID = 'tenant-demo';

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
export class AuthService {
  private readonly appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailQueue: EmailQueueService,
    private readonly profileRegistration: ProfileRegistrationService,
    private readonly legalSignup: LegalSignupService,
  ) {}

  async login(body: AuthLoginRequest): Promise<AuthLoginResponse> {
    const email = body.email.trim().toLowerCase();
    const where = body.tenantId
      ? { tenantId: body.tenantId, email, deletedAt: null }
      : { email, deletedAt: null };

    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    if (!verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async register(
    body: AuthRegisterRequest,
    meta: RegisterRequestMeta = {},
  ): Promise<AuthRegisterResponse> {
    const tenantId = body.tenantId ?? DEFAULT_TENANT_ID;
    const email = body.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: AUTH_REGISTER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
        message: 'Ya existe una cuenta con este email.',
      });
    }
    const passwordHash = hashPassword(body.password);
    const profileType: RegistrationProfileType = body.profileType ?? 'USER';
    if (profileType !== 'USER' && body.profileData == null) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'profileData es requerido para el tipo de perfil seleccionado',
      });
    }

    const signupRequirements = await this.legalSignup.getSignupRequirements(
      tenantId,
      profileType,
    );
    if (!signupRequirements.canProceed) {
      throw new BadRequestException({
        code: LEGAL_SIGNUP_ERROR_CODES.CONFIG_UNAVAILABLE,
        message: LEGAL_SIGNUP_USER_MESSAGES.configUnavailable,
        details: {
          missingRequiredDocuments: signupRequirements.missingRequiredDocuments,
        },
      });
    }

    const versionIds = body.signupLegalAcceptance?.documentVersionIds ?? [];
    if (signupRequirements.required.length > 0) {
      if (versionIds.length === 0) {
        throw new BadRequestException({
          code: LEGAL_SIGNUP_ERROR_CODES.MISSING_LEGAL_ACCEPTANCE,
          message: LEGAL_SIGNUP_USER_MESSAGES.missingAcceptanceIds,
        });
      }
    }

    const cityTrimmed = body.city?.trim() || null;
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: 'USER',
          status: 'ACTIVE',
          ...(cityTrimmed
            ? {
                preferences: {
                  city: cityTrimmed,
                  preferredCity: cityTrimmed,
                  preferredCities: [cityTrimmed],
                },
              }
            : {}),
        },
      });

      if (profileType !== 'USER') {
        await this.profileRegistration.createProfileForRegistration(
          tenantId,
          created.id,
          profileType,
          body.profileData,
          tx,
        );
      }

      if (signupRequirements.required.length > 0) {
        await this.legalSignup.persistSignupAcceptances(
          tx,
          tenantId,
          created.id,
          profileType,
          versionIds,
          meta,
        );
      }

      return created;
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${this.appUrl}/verify-email?token=${verificationToken}`;
    await this.emailQueue.enqueueTemplate({
      templateId: 'AUTH_VERIFY_EMAIL',
      to: user.email,
      variables: {
        userName: user.firstName,
        verifyUrl,
        expiresIn: '24 horas',
        supportEmail:
          process.env.MAIL_REPLY_TO?.trim() || 'soporte@yoteinvito.club',
      },
    });

    await this.emailQueue.enqueueTemplate({
      templateId: welcomeTemplateIdForProfile(profileType),
      to: user.email,
      variables: buildWelcomeTemplateVariables(
        profileType,
        user.firstName,
        body.profileData,
        this.appUrl,
      ),
    });

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!record) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Token inválido o expirado' });
    }
    if (record.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { token } });
      throw new BadRequestException({ code: 'EXPIRED_TOKEN', message: 'El enlace expiró' });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      this.prisma.emailVerificationToken.delete({ where: { token } }),
    ]);
    return { verified: true, message: 'Email verificado correctamente' };
  }

  async applyRole(body: AuthApplyRoleRequest): Promise<{ id: string; message: string }> {
    const tenantId = body.tenantId ?? DEFAULT_TENANT_ID;
    const email = body.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (existingUser) {
      const hasRole =
        existingUser.role === 'PRODUCER_OWNER' ||
        existingUser.role === 'GASTRO_OWNER' ||
        existingUser.role === 'HOTEL_OWNER';
      if (hasRole) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Email already has producer, gastro or hotel role',
        });
      }
    }

    const pendingApp = await this.prisma.roleApplication.findFirst({
      where: { tenantId, email, status: 'PENDING' },
    });
    if (pendingApp) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Application already pending for this email',
      });
    }

    const passwordHash = hashPassword(body.password);
    const app = await this.prisma.roleApplication.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phone?.trim() || null,
        businessName: body.businessName?.trim() || null,
        role: body.role,
      },
    });
    return {
      id: app.id,
      message: 'Application submitted. You will be notified when approved.',
    };
  }

  async findOrCreateFromGoogle(body: AuthGoogleRequest) {
    const tenantId = DEFAULT_TENANT_ID;
    const email = body.email.trim().toLowerCase();
    const parts = (body.name ?? '').trim().split(/\s+/);
    const firstName = parts[0] ?? email.split('@')[0];
    const lastName = parts.slice(1).join(' ') || firstName;

    let user = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email,
          passwordHash: null,
          firstName,
          lastName,
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
      });
    }
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
