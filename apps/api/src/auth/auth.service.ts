import { Injectable, UnauthorizedException, ConflictException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
  Role as SharedRole,
  AuthResendVerificationEmailRequest,
  AuthResendVerificationEmailResponse,
} from '@yo-te-invito/shared';
import {
  AUTH_REGISTER_ERROR_CODES,
  AUTH_LOGIN_ERROR_CODES,
  AUTH_LOGIN_USER_MESSAGES,
  AUTH_VERIFY_EMAIL_ERROR_CODES,
  AUTH_VERIFY_EMAIL_USER_MESSAGES,
  AUTH_RESEND_VERIFICATION_USER_MESSAGES,
  LEGAL_SIGNUP_ERROR_CODES,
  LEGAL_SIGNUP_USER_MESSAGES,
  MASTER_USER_EMAIL,
  Role,
  mapSignupProfileTypeToRole,
  resolveSignupProfileType,
} from '@yo-te-invito/shared';
import { LegalSignupService } from '../modules/legal/legal-signup.service';
import { ProfileRegistrationService } from './profile-registration.service';
import { getAppUrl } from '../email/templates/email-template.util';
import {
  EMAIL_VERIFICATION_TTL_LABEL,
  RESEND_EMAIL_MAX,
  RESEND_EMAIL_WINDOW_MS,
  RESEND_IP_MAX,
  RESEND_IP_WINDOW_MS,
  SlidingWindowRateLimiter,
  createEmailVerificationToken,
  emailVerificationExpiresAt,
  genericResendAcceptedMessage,
  shouldIssueVerificationEmail,
} from './auth-verify-email.util';

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
  private readonly logger = new Logger(AuthService.name);
  private readonly resendEmailLimiter = new SlidingWindowRateLimiter(
    RESEND_EMAIL_MAX,
    RESEND_EMAIL_WINDOW_MS,
  );
  private readonly resendIpLimiter = new SlidingWindowRateLimiter(
    RESEND_IP_MAX,
    RESEND_IP_WINDOW_MS,
  );

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
        emailVerified: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: AUTH_LOGIN_ERROR_CODES.UNAUTHORIZED,
        message: AUTH_LOGIN_USER_MESSAGES.invalidCredentials,
      });
    }

    if (!verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException({
        code: AUTH_LOGIN_ERROR_CODES.UNAUTHORIZED,
        message: AUTH_LOGIN_USER_MESSAGES.invalidCredentials,
      });
    }

    const isMasterUser = email === MASTER_USER_EMAIL.trim().toLowerCase();
    if (!user.emailVerified && !isMasterUser) {
      throw new UnauthorizedException({
        code: AUTH_LOGIN_ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: AUTH_LOGIN_USER_MESSAGES.emailNotVerified,
      });
    }

    const sessionRole = await this.resolveSessionRole(user.tenantId, user.id, user.role);
    const payload = { sub: user.id, tenantId: user.tenantId, role: sessionRole };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: sessionRole as SharedRole,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Users registered before role fix may have USER + active commercial membership.
   * Resolve portal/JWT role from membership when stored role is still USER.
   */
  private async resolveSessionRole(
    tenantId: string,
    userId: string,
    storedRole: string,
  ): Promise<string> {
    if (storedRole !== Role.USER) return storedRole;

    const [producer, gastro, hotel, referrer] = await Promise.all([
      this.prisma.userProducerMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
      this.prisma.userGastroMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
      this.prisma.userHotelMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
      this.prisma.userReferrerMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
    ]);

    if (producer) return Role.PRODUCER_OWNER;
    if (gastro) return Role.GASTRO_OWNER;
    if (hotel) return Role.HOTEL_OWNER;
    if (referrer) return Role.REFERRER;
    return storedRole;
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
    let profileType: RegistrationProfileType;
    try {
      profileType = resolveSignupProfileType({
        profileType: body.profileType,
        profileData: body.profileData,
      });
    } catch {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'profileType es requerido cuando se envía profileData',
      });
    }
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
    this.legalSignup.assertSignupAcceptanceComplete(signupRequirements, versionIds);

    const cityTrimmed = body.city?.trim() || null;
    const signupRole = mapSignupProfileTypeToRole(profileType);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: signupRole,
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

    await this.issueAndSendVerificationEmail(user);

    const appUrl = getAppUrl();
    await this.emailQueue.enqueueTemplate({
      templateId: welcomeTemplateIdForProfile(profileType),
      to: user.email,
      variables: buildWelcomeTemplateVariables(
        profileType,
        user.firstName,
        body.profileData,
        appUrl,
      ),
    });

    return {
      emailVerificationRequired: true as const,
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

  /**
   * Public resend: always the same message. Issues AUTH_VERIFY_EMAIL only if
   * the account exists and emailVerified is still null.
   */
  async resendVerificationEmail(
    body: AuthResendVerificationEmailRequest,
    meta: RegisterRequestMeta = {},
  ): Promise<AuthResendVerificationEmailResponse> {
    const email = body.email.trim().toLowerCase();
    const ipKey = (meta.ipAddress ?? 'unknown').trim() || 'unknown';

    const ipLimit = this.resendIpLimiter.consume(`ip:${ipKey}`);
    const emailLimit = this.resendEmailLimiter.consume(`email:${email}`);
    if (!ipLimit.ok || !emailLimit.ok) {
      throw new HttpException(
        {
          code: AUTH_VERIFY_EMAIL_ERROR_CODES.TOO_MANY_REQUESTS,
          message: AUTH_RESEND_VERIFICATION_USER_MESSAGES.tooManyRequests,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const where = body.tenantId
      ? { tenantId: body.tenantId, email, deletedAt: null }
      : { email, deletedAt: null };

    const user = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerified: true,
      },
    });

    if (shouldIssueVerificationEmail(user)) {
      await this.issueAndSendVerificationEmail(user!);
      this.logger.log(`Verification email queued for unverified user ${user!.id}`);
    }

    return { message: genericResendAcceptedMessage() };
  }

  /** Replaces any prior token, then enqueues AUTH_VERIFY_EMAIL. Token is not logged. */
  private async issueAndSendVerificationEmail(user: {
    id: string;
    email: string;
    firstName: string | null;
  }): Promise<void> {
    const token = createEmailVerificationToken();
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: emailVerificationExpiresAt(),
      },
    });

    const appUrl = getAppUrl();
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    await this.emailQueue.enqueueTemplate({
      templateId: 'AUTH_VERIFY_EMAIL',
      to: user.email,
      variables: {
        userName: user.firstName?.trim() || user.email.split('@')[0] || 'ahí',
        verifyUrl,
        expiresIn: EMAIL_VERIFICATION_TTL_LABEL,
        supportEmail:
          process.env.MAIL_REPLY_TO?.trim() || 'soporte@yoteinvito.club',
      },
    });
  }

  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!record) {
      throw new BadRequestException({
        code: AUTH_VERIFY_EMAIL_ERROR_CODES.INVALID_TOKEN,
        message: AUTH_VERIFY_EMAIL_USER_MESSAGES.invalidOrExpired,
      });
    }
    if (record.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { token } });
      throw new BadRequestException({
        code: AUTH_VERIFY_EMAIL_ERROR_CODES.EXPIRED_TOKEN,
        message: AUTH_VERIFY_EMAIL_USER_MESSAGES.invalidOrExpired,
      });
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
    const sessionRole = await this.resolveSessionRole(user.tenantId, user.id, user.role);
    const payload = { sub: user.id, tenantId: user.tenantId, role: sessionRole };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: sessionRole as SharedRole,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
