'use client';

import { MASTER_USER_EMAIL } from '@yo-te-invito/shared';
import type { AdminUserListItem } from '@/repositories/interfaces';

export function canAdminDeleteUser(
  user: AdminUserListItem,
  currentUserId?: string | null,
): boolean {
  if (user.email.toLowerCase() === MASTER_USER_EMAIL.toLowerCase()) return false;
  if (currentUserId && user.id === currentUserId) return false;
  return true;
}
