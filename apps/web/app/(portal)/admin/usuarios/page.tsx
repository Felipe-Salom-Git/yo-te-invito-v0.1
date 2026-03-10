'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast, PageLoader, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';
const ROLES = ['ADMIN', 'PRODUCER_OWNER', 'PRODUCER_STAFF', 'GASTRO_OWNER', 'REFERRER', 'USER', 'SCANNER'];

export default function AdminUsuariosPage() {
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

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Usuarios' }]} />
      <SectionTitle>Gestión de roles</SectionTitle>
      <p className="mt-2 text-text-muted">
        Asignar roles a usuarios.
      </p>

      {isLoading ? (
        <PageLoader message="Cargando usuarios…" />
      ) : (
        <ul className="mt-6 space-y-3">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4">
              <div>
                <p className="font-medium text-text">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-sm text-text-muted">{u.email}</p>
              </div>
              <select
                value={u.role}
                onChange={(e) => updateMutation.mutate({ userId: u.id, role: e.target.value })}
                className="rounded border border-border bg-bg px-3 py-2 text-text"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && users.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No hay usuarios" description="Ejecutá el seed o registrá usuarios." />
        </div>
      )}
    </PageContainer>
  );
}
