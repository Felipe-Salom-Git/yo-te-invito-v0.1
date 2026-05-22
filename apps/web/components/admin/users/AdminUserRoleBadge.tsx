import { getUserRoleLabel } from '@/lib/admin/user-role-labels';

type AdminUserRoleBadgeProps = {
  role: string;
};

export function AdminUserRoleBadge({ role }: AdminUserRoleBadgeProps) {
  const isAdmin = role === 'ADMIN';
  const isProducer = role.startsWith('PRODUCER');
  const style = isAdmin
    ? 'border-accent/40 bg-accent/10 text-accent'
    : isProducer
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
      : 'border-border bg-bg-muted text-text-muted';

  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${style}`}>
      {getUserRoleLabel(role)}
    </span>
  );
}
