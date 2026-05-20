'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { generalPublicationsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { getCategoryLabel, getContentDetailHref } from '@/lib/home/contentRoutes';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'paused', label: 'Pausados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'draft', label: 'Borradores' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'event', label: 'Evento' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'rental', label: 'Alquiler' },
  { value: 'excursion', label: 'Excursión' },
  { value: 'hotel', label: 'Hotel' },
];

export default function AdminPublicacionesGeneralesPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filterKey = useMemo(
    () => JSON.stringify({ statusFilter, categoryFilter }),
    [statusFilter, categoryFilter],
  );

  const { data, isLoading } = useQuery({
    queryKey: generalPublicationsKeys.list(filterKey),
    queryFn: () =>
      repos.generalPublications.list({
        limit: 100,
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      repos.events.update(eventId, { status: status.toUpperCase() }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generalPublicationsKeys.all });
    },
  });

  const publications = data?.data ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Publicaciones Generales</SectionTitle>
      <p className="mt-2 text-text-muted">
        Contenido editorial creado desde administración, sin ticketera. La moderación de eventos de
        productoras está en Productoras.
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
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Link href="/admin/publicaciones-generales/nuevo">
          <Button variant="outline">Nueva publicación</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {publications.map((item) => {
            const href = getContentDetailHref({
              id: item.id,
              category: item.category ?? 'event',
            });
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link href={href} className="font-medium text-text hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="text-sm text-text-muted">
                    {getCategoryLabel((item.category as 'event') ?? 'event')}
                    {' · '}
                    {item.city ?? item.venueName ?? '—'}
                    {item.startAt
                      ? ` · ${new Date(item.startAt).toLocaleDateString()}`
                      : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <AdminProducerStatusBadge status={(item as { status?: string }).status ?? 'draft'} />
                    <span className="text-xs text-text-muted">Sin ticketera</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {((item as { status?: string }).status === 'pending' ||
                    (item as { status?: string }).status === 'draft') && (
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ eventId: item.id, status: 'approved' })}
                      disabled={updateMutation.isPending}
                    >
                      Aprobar
                    </Button>
                  )}
                  {(item as { status?: string }).status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ eventId: item.id, status: 'paused' })}
                      disabled={updateMutation.isPending}
                    >
                      Pausar
                    </Button>
                  )}
                  {((item as { status?: string }).status === 'approved' ||
                    (item as { status?: string }).status === 'paused' ||
                    (item as { status?: string }).status === 'pending' ||
                    (item as { status?: string }).status === 'draft') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateMutation.mutate({ eventId: item.id, status: 'cancelled' })
                      }
                      disabled={updateMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && publications.length === 0 && (
        <p className="mt-6 text-text-muted">No hay publicaciones con ese filtro.</p>
      )}
    </PageContainer>
  );
}
