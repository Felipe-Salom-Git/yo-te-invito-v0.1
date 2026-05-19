import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type { JwtPayload } from './jwt-or-dev-auth.guard';

/**
 * Attaches `request.user` when Bearer or X-Dev-User-Id is valid; otherwise leaves user unset (guest).
 * If an Authorization Bearer header is present but invalid, rejects (do not silently downgrade to guest).
 */
@Injectable()
export class OptionalJwtOrDevAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { id: string; tenantId: string; role: string };
    }>();

    request.user = undefined;

    const authHeader = request.headers['authorization'];
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

    if (bearerToken) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(bearerToken);
        request.user = {
          id: payload.sub,
          tenantId: payload.tenantId,
          role: payload.role,
        };
        return true;
      } catch {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid or expired token',
        });
      }
    }

    const allowDevUserIdHeader =
      process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH_ENABLED === 'true';
    if (allowDevUserIdHeader) {
      const raw = request.headers['x-dev-user-id'];
      const userId = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
      if (userId?.trim()) {
        const user = await this.prisma.user.findFirst({
          where: { id: userId.trim(), deletedAt: null },
          select: { id: true, tenantId: true, role: true },
        });
        if (user) {
          request.user = user;
        }
      }
    }

    return true;
  }
}
