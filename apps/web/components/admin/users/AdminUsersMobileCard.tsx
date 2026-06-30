'use client';

import type { AdminUserListItem } from '@/repositories/interfaces';
import { AdminUserRoleBadge } from './AdminUserRoleBadge';
import { AdminUserProfileBadges } from './AdminUserProfileBadges';
import { AdminUserRoleSelect } from './AdminUserRoleSelect';
import { AdminUserDeleteButton } from './AdminUserDeleteButton';
import { AdminDeepDeleteButton } from '@/components/admin/AdminDeepDeleteButton';
import { canAdminDeleteUser } from '@/lib/admin/admin-user-delete';

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type AdminUsersMobileCardProps = {
  user: AdminUserListItem;
  currentUserId?: string | null;
  roleChangeDisabled?: boolean;
  deleteDisabled?: boolean;
  onRequestRoleChange: (role: string) => void;
  onRequestDelete: () => void;
  onUserDeepDeleted?: () => void;
};

export function AdminUsersMobileCard({
  user,
  currentUserId,
  roleChangeDisabled,
  deleteDisabled,
  onRequestRoleChange,
  onRequestDelete,
  onUserDeepDeleted,
}: AdminUsersMobileCardProps) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-text">{fullName || '—'}</p>
          <p className="truncate text-sm text-text-muted">{user.email}</p>
        </div>
        <AdminUserRoleBadge role={user.role} />
      </div>
      <dl className="mt-3 space-y-1 text-xs text-text-muted">
        <div>
          <dt className="inline font-medium">Estado: </dt>
          <dd className="inline">{user.status}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Email: </dt>
          <dd className="inline">{user.emailVerified ? 'Verificado' : 'Sin verificar'}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Alta: </dt>
          <dd className="inline">{formatDt(user.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-medium">Perfiles</dt>
          <dd className="mt-1">
            <AdminUserProfileBadges user={user} />
          </dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3">
        <AdminUserRoleSelect
          user={user}
          disabled={roleChangeDisabled}
          onRequestChange={onRequestRoleChange}
        />
        <AdminUserDeleteButton
          user={user}
          currentUserId={currentUserId}
          disabled={deleteDisabled}
          onClick={onRequestDelete}
        />
        {canAdminDeleteUser(user, currentUserId) ? (
          <AdminDeepDeleteButton
            entityType="USER"
            entityId={user.id}
            entityLabel={user.email}
            buttonLabel="Eliminación profunda"
            onSuccess={onUserDeepDeleted}
          />
        ) : null}
      </div>
    </article>
  );
}
