'use client';

import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { User } from '@/repositories/interfaces';
import { PageContainer, SectionTitle, useToast, PageLoader, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

type UserTabId =
  | 'admin'
  | 'producer'
  | 'gastro'
  | 'hotel'
  | 'referrer'
  | 'public'
  | 'scanner'
  | 'otros';

const ROLES = [
  'ADMIN',
  'PRODUCER_OWNER',
  'PRODUCER_STAFF',
  'GASTRO_OWNER',
  'HOTEL_OWNER',
  'REFERRER',
  'USER',
  'SCANNER',
] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  PRODUCER_OWNER: 'Dueño de productora',
  PRODUCER_STAFF: 'Staff de productora',
  GASTRO_OWNER: 'Dueño gastronómico',
  HOTEL_OWNER: 'Dueño de hotel',
  REFERRER: 'Referidor',
  USER: 'Usuario',
  SCANNER: 'Scanner',
};

const TABS: { id: UserTabId; label: string; roles: string[] }[] = [
  { id: 'admin', label: 'Administradores', roles: ['ADMIN'] },
  { id: 'producer', label: 'Productoras', roles: ['PRODUCER_OWNER', 'PRODUCER_STAFF'] },
  { id: 'gastro', label: 'Gastronomía', roles: ['GASTRO_OWNER'] },
  { id: 'hotel', label: 'Hoteles', roles: ['HOTEL_OWNER'] },
  { id: 'referrer', label: 'Referidores', roles: ['REFERRER'] },
  { id: 'public', label: 'Usuarios', roles: ['USER'] },
  { id: 'scanner', label: 'Scanner', roles: ['SCANNER'] },
  { id: 'otros', label: 'Otros', roles: [] },
];

const KNOWN_ROLES = new Set(TABS.flatMap((t) => t.roles));

function UserRow({
  user,
  onRoleChange,
  isUpdating,
}: {
  user: User;
  onRoleChange: (role: string) => void;
  isUpdating: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4">
      <div>
        <p className="font-medium text-text">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-sm text-text-muted">{user.email}</p>
        <p className="mt-1 text-xs text-text-muted">
          Rol actual: {ROLE_LABELS[user.role] ?? user.role}
        </p>
      </div>
      <select
        value={user.role}
        disabled={isUpdating}
        onChange={(e) => onRoleChange(e.target.value)}
        className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        aria-label={`Rol de ${user.email}`}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r] ?? r}
          </option>
        ))}
      </select>
    </li>
  );
}

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState<UserTabId>('admin');
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'admin', TENANT_ID],
    queryFn: () => repos.users.list(TENANT_ID),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      repos.users.updateRole(userId, role),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const countsByTab = useMemo(() => {
    const counts: Record<UserTabId, number> = {
      admin: 0,
      producer: 0,
      gastro: 0,
      hotel: 0,
      referrer: 0,
      public: 0,
      scanner: 0,
      otros: 0,
    };
    for (const u of users) {
      const section = TABS.find((t) => t.id !== 'otros' && t.roles.includes(u.role));
      if (section) {
        counts[section.id] += 1;
      } else if (!KNOWN_ROLES.has(u.role)) {
        counts.otros += 1;
      }
    }
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (tab === 'otros') {
      return users.filter((u) => !KNOWN_ROLES.has(u.role));
    }
    const active = TABS.find((t) => t.id === tab);
    if (!active) return [];
    return users.filter((u) => active.roles.includes(u.role));
  }, [users, tab]);

  const activeTabMeta = TABS.find((t) => t.id === tab);

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Usuarios' }]} />
      <SectionTitle>Usuarios</SectionTitle>
      <p className="mt-2 text-text-muted">
        Elegí un tipo de usuario para ver el listado. Podés cambiar el rol desde cada tarjeta.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = countsByTab[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === t.id ? 'bg-accent text-bg' : 'border border-border text-text-muted hover:text-text'
              }`}
            >
              {t.label}
              {count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="mt-8">
          <PageLoader message="Cargando usuarios…" />
        </div>
      ) : users.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No hay usuarios" description="Ejecutá el seed o registrá usuarios." />
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="mt-8 text-text-muted">
          No hay usuarios en {activeTabMeta?.label ?? 'esta categoría'}.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {filteredUsers.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isUpdating={updateMutation.isPending}
              onRoleChange={(role) => updateMutation.mutate({ userId: u.id, role })}
            />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
