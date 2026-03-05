import { z } from 'zod';
import { Role, UserStatus } from '../enums';

/**
 * Create user request schema
 */
export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
