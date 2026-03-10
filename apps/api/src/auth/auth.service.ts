import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../email/email-queue.service';
import { renderWelcomeEmail, renderVerificationEmail } from '../email/email-templates';
import * as crypto from 'crypto';
import type {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  AuthApplyRoleRequest,
  AuthGoogleRequest,
} from '@yo-te-invito/shared';

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

  async register(body: AuthRegisterRequest): Promise<AuthRegisterResponse> {
    const tenantId = body.tenantId ?? DEFAULT_TENANT_ID;
    const email = body.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Email already in use',
      });
    }
    const passwordHash = hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        role: 'USER',
        status: 'ACTIVE',
      },
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
    const { html, text } = renderVerificationEmail(user.firstName, verifyUrl);
    await this.emailQueue.enqueue({
      to: user.email,
      subject: 'Verifica tu email — Yo Te Invito',
      html,
      text,
    });

    const welcomeHtml = renderWelcomeEmail(user.firstName);
    await this.emailQueue.enqueue({
      to: user.email,
      subject: 'Bienvenido a Yo Te Invito',
      html: welcomeHtml.html,
      text: welcomeHtml.text,
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
        existingUser.role === 'PRODUCER_OWNER' || existingUser.role === 'GASTRO_OWNER';
      if (hasRole) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Email already has producer or gastro role',
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
