import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';

export type JwtPayload = { sub: string; tenantId: string; role: string };

@Injectable()
export class JwtOrDevAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { id: string; tenantId: string; role: string };
    }>();

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

    const isDev = process.env.NODE_ENV === 'development';
    const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';
    if (!isDev && !devAuthEnabled) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authorization required (Bearer token or X-Dev-User-Id in dev)',
      });
    }

    const raw = request.headers['x-dev-user-id'];
    const userId = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
    if (!userId?.trim()) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'X-Dev-User-Id header is required when not using Bearer token',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, tenantId: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }
    request.user = user;
    return true;
  }
}
