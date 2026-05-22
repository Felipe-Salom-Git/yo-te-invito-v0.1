'use client';

import { MASTER_USER_EMAIL } from '@yo-te-invito/shared';
import { USER_ROLE_OPTIONS } from '@/lib/admin/user-role-labels';
import type { AdminUserListItem } from '@/repositories/interfaces';

type AdminUserRoleSelectProps = {
  user: AdminUserListItem;
  disabled?: boolean;
  onRequestChange: (role: string) => void;
};

export function AdminUserRoleSelect({
  user,
  disabled,
  onRequestChange,
}: AdminUserRoleSelectProps) {
  const isMaster = user.email.toLowerCase() === MASTER_USER_EMAIL.toLowerCase();

  if (isMaster) {
    return (
      <span
        className="rounded border border-dashed border-accent/40 px-2 py-1 text-xs text-accent"
        title="Cuenta maestro — el rol no se modifica desde admin"
      >
        Cuenta maestro
      </span>
    );
  }

  return (
    <select
      value={user.role}
      disabled={disabled}
      onChange={(e) => onRequestChange(e.target.value)}
      className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
      aria-label={`Rol de ${user.email}`}
    >
      {USER_ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
