'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';
const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  SENT: 'Enviado',
  REJECTED: 'Rechazado',
};

export default function AdminPayoutsPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['payouts', 'admin', TENANT_ID],
    queryFn: () => repos.payouts.listAll(TENANT_ID),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'admin', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, limit: 200 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      repos.payouts.updateStatus(id, status as 'SENT' | 'REJECTED'),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payouts'] }),
  });

  const events = eventsData?.data ?? [];
  const eventTitles: Record<string, string> = {};
  events.forEach((e) => { eventTitles[e.id] = e.title; });

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Aprobación de payouts</SectionTitle>
      <p className="mt-2 text-text-muted">
        Revisar y aprobar solicitudes de retiro de productoras.
      </p>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-text">
                    {eventTitles[p.eventId] ?? p.eventId} — ${(p.amountCents / 100).toLocaleString('es-AR')}
                  </p>
                  <p className="text-sm text-text-muted">
                    {new Date(p.createdAt).toLocaleDateString('es-AR')} · {STATUS_LABELS[p.status] ?? p.status}
                  </p>
                  {p.bankInfo && (
                    <p className="mt-1 text-xs text-text-muted">
                      {p.bankInfo.titular} · {p.bankInfo.banco} · {p.bankInfo.cbu}
                    </p>
                  )}
                </div>
                {p.status === 'REQUESTED' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: p.id, status: 'SENT' })}
                      disabled={updateMutation.isPending}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ id: p.id, status: 'REJECTED' })}
                      disabled={updateMutation.isPending}
                      className="text-red-500 hover:bg-red-500/10"
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && (!payouts || payouts.length === 0) && (
        <p className="mt-6 text-text-muted">No hay solicitudes de retiro.</p>
      )}
    </PageContainer>
  );
}
