import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isDev = process.env.NODE_ENV === 'development';
    const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';
    if (!isDev && !devAuthEnabled) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Dev auth is disabled',
      });
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: unknown }>();
    const raw = request.headers['x-dev-user-id'];
    const userId = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;

    if (!userId?.trim()) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'X-Dev-User-Id header is required',
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
