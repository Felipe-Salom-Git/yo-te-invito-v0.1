'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { excursionOperatorsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function AdminExcursionesPage() {
  const repos = useRepositories();

  const { data, isLoading } = useQuery({
    queryKey: excursionOperatorsKeys.adminList(TENANT_ID),
    queryFn: () =>
      repos.excursionOperators.listAdmin({ tenantId: TENANT_ID, includeInactive: true }),
  });

  const operators = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Operadores de excursiones</SectionTitle>
      <p className="mt-2 text-text-muted">
        Gestioná operadores/locales y las excursiones asociadas a cada uno.
      </p>

      <Link
        href="/admin/excursiones/operadores/nuevo"
        className="mt-6 inline-block rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
      >
        Nuevo operador
      </Link>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {operators.map((op) => (
            <li
              key={op.id}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
            >
              <div>
                <Link
                  href={`/admin/excursiones/operadores/${op.id}`}
                  className="font-medium text-text hover:text-accent"
                >
                  {op.name}
                </Link>
                <p className="text-sm text-text-muted">
                  {[op.city, op.address].filter(Boolean).join(' · ') || 'Sin dirección'}
                  {op.excursionCount != null ? ` · ${op.excursionCount} excursión(es)` : ''}
                  {!op.isActive ? ' · Inactivo' : ''}
                </p>
              </div>
              <Link
                href={`/admin/excursiones/operadores/${op.id}/editar`}
                className="text-sm text-accent hover:underline"
              >
                Editar operador
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && operators.length === 0 && (
        <p className="mt-6 text-text-muted">No hay operadores. Creá el primero.</p>
      )}
    </PageContainer>
  );
}
