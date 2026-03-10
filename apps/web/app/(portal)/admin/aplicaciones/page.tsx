'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast, Button, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function AdminAplicacionesPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', TENANT_ID],
    queryFn: () => repos.applications.listPending(TENANT_ID),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => repos.applications.approve(TENANT_ID, id),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => repos.applications.reject(TENANT_ID, id),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Solicitudes' }]} />
      <SectionTitle>Solicitudes pendientes</SectionTitle>
      <p className="mt-2 text-text-muted">
        Productoras y gastro que solicitaron cuenta.
      </p>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : applications.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No hay solicitudes pendientes" />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div>
                <p className="font-medium text-text">
                  {app.firstName} {app.lastName}
                </p>
                <p className="text-sm text-text-muted">{app.email}</p>
                {app.businessName && (
                  <p className="text-sm text-text-muted">{app.businessName}</p>
                )}
                <span className="inline-block rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                  {app.role}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectMutation.mutate(app.id)}
                  disabled={rejectMutation.isPending}
                >
                  Rechazar
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(app.id)}
                  disabled={approveMutation.isPending}
                >
                  Aprobar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
