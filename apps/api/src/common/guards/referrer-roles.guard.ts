/**
 * Referrer routes: allow ADMIN, REFERRER, or active referrer membership.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, Role } from '@yo-te-invito/shared';
import { ProfilesAuthorizationService } from '../profiles-authorization.service';
import { REQUIRE_ROLES_KEY } from './roles.guard';

@Injectable()
export class ReferrerRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(REQUIRE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: { id: string; tenantId: string; role: Role } }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      });
    }

    if (requiredRoles.includes(user.role)) return true;

    const hasReferrer = requiredRoles.includes(Role.REFERRER);
    if (hasReferrer && (await this.profilesAuth.hasReferrerAccess(user.tenantId, user.id))) {
      return true;
    }

    throw new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message: 'Insufficient permissions',
    });
  }
}
