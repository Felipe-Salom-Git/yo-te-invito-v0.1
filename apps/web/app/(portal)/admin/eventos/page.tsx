'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'paused', label: 'Pausados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'draft', label: 'Borradores' },
];

export default function AdminEventosPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'admin', TENANT_ID, statusFilter],
    queryFn: () =>
      repos.events.list({
        tenantId: TENANT_ID,
        limit: 100,
        forAdmin: true,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      repos.events.update(eventId, { status: status.toUpperCase() }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const events = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Eventos — Cola de aprobación</SectionTitle>
      <p className="mt-2 text-text-muted">
        Moderación y gestión de eventos. Aprobá, pausá o cancelá según corresponda.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Link href="/admin/eventos/nuevo">
          <Button variant="outline">Crear evento promocional</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div className="min-w-0 flex-1">
                <Link href={`/events/${ev.id}`} className="font-medium text-text hover:text-accent">
                  {ev.title}
                </Link>
                <p className="text-sm text-text-muted">
                  {ev.city ?? ev.venueName ?? '—'} · {ev.startAt ? new Date(ev.startAt).toLocaleDateString() : '—'}
                </p>
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                    (ev as { status?: string }).status === 'pending'
                      ? 'bg-amber-500/20 text-amber-600'
                      : (ev as { status?: string }).status === 'approved'
                        ? 'bg-green-500/20 text-green-600'
                        : (ev as { status?: string }).status === 'cancelled'
                          ? 'bg-red-500/20 text-red-600'
                          : (ev as { status?: string }).status === 'paused'
                            ? 'bg-gray-500/20 text-gray-600'
                            : 'bg-border text-text-muted'
                  }`}
                >
                  {(ev as { status?: string }).status ?? 'draft'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {((ev as { status?: string }).status === 'pending' ||
                  (ev as { status?: string }).status === 'draft') && (
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ eventId: ev.id, status: 'approved' })}
                    disabled={updateMutation.isPending}
                  >
                    Aprobar
                  </Button>
                )}
                {(ev as { status?: string }).status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ eventId: ev.id, status: 'paused' })}
                    disabled={updateMutation.isPending}
                  >
                    Pausar
                  </Button>
                )}
                {((ev as { status?: string }).status === 'approved' ||
                  (ev as { status?: string }).status === 'paused' ||
                  (ev as { status?: string }).status === 'pending' ||
                  (ev as { status?: string }).status === 'draft') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ eventId: ev.id, status: 'cancelled' })}
                    disabled={updateMutation.isPending}
                    className="text-red-500 hover:bg-red-500/10"
                  >
                    {(ev as { status?: string }).status === 'draft' ||
                    (ev as { status?: string }).status === 'pending'
                      ? 'Rechazar'
                      : 'Cancelar'}
                  </Button>
                )}
                {(ev as { status?: string }).status === 'paused' && (
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ eventId: ev.id, status: 'approved' })}
                    disabled={updateMutation.isPending}
                  >
                    Reanudar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && events.length === 0 && (
        <p className="mt-6 text-text-muted">No hay eventos con ese filtro.</p>
      )}
    </PageContainer>
  );
}
