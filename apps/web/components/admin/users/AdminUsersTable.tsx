'use client';

import type { AdminUserListItem } from '@/repositories/interfaces';
import { AdminUserRoleBadge } from './AdminUserRoleBadge';
import { AdminUserProfileBadges } from './AdminUserProfileBadges';
import { AdminUserRoleSelect } from './AdminUserRoleSelect';

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type AdminUsersTableProps = {
  users: AdminUserListItem[];
  roleChangeDisabled?: boolean;
  onRequestRoleChange: (user: AdminUserListItem, role: string) => void;
};

export function AdminUsersTable({
  users,
  roleChangeDisabled,
  onRequestRoleChange,
}: AdminUsersTableProps) {
  if (users.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted/60 text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Perfiles</th>
            <th className="px-4 py-3 font-medium">Alta</th>
            <th className="px-4 py-3 font-medium">Cambiar rol</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/50 align-top">
              <td className="px-4 py-3">
                <p className="font-medium text-text">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-text-muted">{user.email}</p>
              </td>
              <td className="px-4 py-3">
                <AdminUserRoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3 text-text-muted">{user.status}</td>
              <td className="px-4 py-3 text-text-muted">
                {user.emailVerified ? 'Verificado' : '—'}
              </td>
              <td className="max-w-[200px] px-4 py-3">
                <AdminUserProfileBadges user={user} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                {formatDt(user.createdAt)}
              </td>
              <td className="px-4 py-3">
                <AdminUserRoleSelect
                  user={user}
                  disabled={roleChangeDisabled}
                  onRequestChange={(role) => onRequestRoleChange(user, role)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
