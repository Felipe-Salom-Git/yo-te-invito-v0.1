/**
 * User type — aligned with Prisma User model
 * Tipo User — alineado con modelo Prisma User
 */

import type { Role, UserStatus } from '../enums';

export interface UserBase {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
