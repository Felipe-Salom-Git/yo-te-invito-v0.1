'use client';

import { Button } from '@/components';
import type { AdminUserListItem } from '@/repositories/interfaces';
import { canAdminDeleteUser } from '@/lib/admin/admin-user-delete';

type AdminUserDeleteButtonProps = {
  user: AdminUserListItem;
  currentUserId?: string | null;
  disabled?: boolean;
  onClick: () => void;
};

export function AdminUserDeleteButton({
  user,
  currentUserId,
  disabled,
  onClick,
}: AdminUserDeleteButtonProps) {
  if (!canAdminDeleteUser(user, currentUserId)) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
      disabled={disabled}
      onClick={onClick}
    >
      Eliminar usuario
    </Button>
  );
}
