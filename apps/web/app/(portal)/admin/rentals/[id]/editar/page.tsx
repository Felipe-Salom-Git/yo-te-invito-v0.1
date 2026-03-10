'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function AdminRentalEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => repos.events.getDetail(id, TENANT_ID),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [capacityTotal, setCapacityTotal] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setCity(event.city ?? '');
      setVenueName(event.venueName ?? '');
      setStartAt(event.startAt ? event.startAt.slice(0, 16) : '');
      setCapacityTotal(event.capacityTotal != null ? String(event.capacityTotal) : '');
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => repos.events.update(id, patch),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.push('/admin/rentals');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      city: city.trim() || null,
      venueName: venueName.trim() || null,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      capacityTotal: capacityTotal ? parseInt(capacityTotal, 10) : null,
    });
  };

  if (isLoading || !event) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/admin/rentals" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Rentals
      </Link>
      <SectionTitle>Editar rental</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
        <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="Lugar" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        <Input
          label="Fecha inicio"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <Input
          label="Capacidad"
          type="number"
          value={capacityTotal}
          onChange={(e) => setCapacityTotal(e.target.value)}
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link href="/admin/rentals">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
