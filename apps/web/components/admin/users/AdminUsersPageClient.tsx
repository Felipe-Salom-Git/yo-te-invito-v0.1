'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
  useToast,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { getUserRoleLabel } from '@/lib/admin/user-role-labels';
import { useAdminUsersUrlFilters } from '@/lib/admin/useAdminUsersUrlFilters';
import {
  ADMIN_USERS_DEFAULT_FILTERS,
  filtersToAdminUsersQuery,
  type AdminUsersFiltersState,
} from '@/lib/admin/admin-users-filters';
import { useAdminUsersList } from '@/lib/query/admin-users';
import { adminUsersKeys } from '@/lib/query/keys';
import { useRepositories } from '@/repositories/context';
import type { AdminUserListItem } from '@/repositories/interfaces';
import { AdminUsersFilters } from './AdminUsersFilters';
import { AdminUsersTable } from './AdminUsersTable';
import { AdminUsersMobileCard } from './AdminUsersMobileCard';

export function AdminUsersPageClient() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { filters, setFilters, clearFilters } = useAdminUsersUrlFilters();
  const [draft, setDraft] = useState<AdminUsersFiltersState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const apiQuery = useMemo(() => filtersToAdminUsersQuery(filters, 20), [filters]);

  const listQuery = useAdminUsersList(
    apiQuery,
    filtersKey,
    status === 'authenticated',
  );

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      repos.adminUsers.updateRole(userId, role),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Rol actualizado', 'success');
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    },
  });

  const users = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const handleRoleChange = (user: AdminUserListItem, role: string) => {
    if (role === user.role) return;
    const label = getUserRoleLabel(role);
    const ok = window.confirm(
      `¿Cambiar el rol de ${user.email} a «${label}»? Esta acción afecta los permisos del usuario.`,
    );
    if (!ok) return;
    updateRoleMutation.mutate({ userId: user.id, role });
  };

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando usuarios…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión como administrador.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>

      <header>
        <SectionTitle>Usuarios</SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Buscá y filtrá cuentas reales del tenant. El cambio de rol requiere confirmación; la
          cuenta maestro no se modifica desde aquí.
        </p>
      </header>

      <div className="mt-6">
        <AdminUsersFilters
          filters={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onClear={() => {
            clearFilters();
            setDraft(ADMIN_USERS_DEFAULT_FILTERS);
          }}
        />
      </div>

      {listQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(listQuery.error)}
          onRetry={() => listQuery.refetch()}
        />
      ) : null}

      <div className="mt-6">
        {listQuery.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Sin usuarios"
            description="No hay resultados para estos filtros."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              {meta?.total ?? users.length} usuario(s)
              {meta && meta.totalPages > 1
                ? ` · página ${meta.page} de ${meta.totalPages}`
                : ''}
            </p>
            <AdminUsersTable
              users={users}
              roleChangeDisabled={updateRoleMutation.isPending}
              onRequestRoleChange={handleRoleChange}
            />
            <ul className="mt-4 space-y-3 md:hidden">
              {users.map((u) => (
                <li key={u.id}>
                  <AdminUsersMobileCard
                    user={u}
                    roleChangeDisabled={updateRoleMutation.isPending}
                    onRequestRoleChange={(role) => handleRoleChange(u, role)}
                  />
                </li>
              ))}
            </ul>
            {meta && meta.totalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setFilters({ page: meta.page - 1 })}
                >
                  Anterior
                </Button>
                <span className="text-sm text-text-muted">
                  Página {meta.page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setFilters({ page: meta.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
