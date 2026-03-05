import { SetMetadata } from '@nestjs/common';
import type { Role } from '@yo-te-invito/shared';
import { REQUIRE_ROLES_KEY } from '../guards/roles.guard';

export const RequireRole = (...roles: Role[]) => SetMetadata(REQUIRE_ROLES_KEY, roles);
