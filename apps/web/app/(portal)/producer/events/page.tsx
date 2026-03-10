'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { eventFormSchema, type EventFormData, type TandaFormItem } from '@/lib/schemas/event';
import { PageContainer, SectionTitle, Card, CardContent, Button, Input, Modal, useToast, PageLoader, EventCardSkeleton, EmptyState, Breadcrumbs } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function ProducerEventsPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const defaultForm: EventFormData = {
    title: '',
    description: '',
    startAt: new Date().toISOString().slice(0, 16),
    endAt: '',
    city: '',
    venueName: '',
    venueAddress: '',
    capacityTotal: null,
    coverImageUrl: null,
    geoLat: null,
    geoLng: null,
    isTicketingEnabled: true,
    status: 'draft',
  };
  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [tandas, setTandas] = useState<TandaFormItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, t],
    queryFn: () => repos.events.list({ tenantId: t, producerId: PRODUCER_ID, limit: 50 }),
    enabled: !!t && status === 'authenticated',
  });

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      tandasToCreate,
    }: {
      data: EventFormData;
      tandasToCreate: TandaFormItem[];
    }) => {
      const event = await repos.events.create({
        tenantId: t,
        producerId: PRODUCER_ID,
        title: data.title,
        description: data.description || null,
        startAt: data.startAt ? new Date(data.startAt).toISOString() : new Date().toISOString(),
        endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
        city: data.city || null,
        venueName: data.venueName || null,
        venueAddress: data.venueAddress || null,
        capacityTotal: data.capacityTotal ?? null,
        coverImageUrl: data.coverImageUrl || null,
        geoLat: data.geoLat ?? null,
        geoLng: data.geoLng ?? null,
        isTicketingEnabled: data.isTicketingEnabled,
        status: data.status,
        media: data.coverImageUrl ? [{ id: `img-${Date.now()}`, type: 'image', url: data.coverImageUrl, sortOrder: 0 }] : [],
      });
      for (let i = 0; i < tandasToCreate.length; i++) {
        const ta = tandasToCreate[i]!;
        await repos.ticketTypes.create(event.id, {
          name: ta.name,
          price: ta.price,
          capacityAvailable: ta.capacityAvailable,
        });
      }
      return event;
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
      setShowForm(false);
      setForm(defaultForm);
      setTandas([]);
    },
  });

  const addTanda = () => setTandas((p) => [...p, { name: '', price: 0, capacityAvailable: 10 }]);
  const removeTanda = (i: number) => setTandas((p) => p.filter((_, j) => j !== i));
  const setTanda = (i: number, patch: Partial<TandaFormItem>) =>
    setTandas((p) => p.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventFormData }) =>
      repos.events.update(id, {
        title: data.title,
        description: data.description || null,
        startAt: data.startAt ? new Date(data.startAt).toISOString() : undefined,
        endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
        city: data.city || null,
        venueName: data.venueName || null,
        venueAddress: data.venueAddress || null,
        capacityTotal: data.capacityTotal ?? null,
        coverImageUrl: data.coverImageUrl || null,
        geoLat: data.geoLat ?? null,
        geoLng: data.geoLng ?? null,
        isTicketingEnabled: data.isTicketingEnabled,
        status: data.status,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
      setEditingId(null);
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, coverImageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = eventFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => { const p = err.path[0] as string; if (p) errs[p] = err.message; });
      setErrors(errs);
      return;
    }
    const capTotal = parsed.data.capacityTotal ?? null;
    const sumCap = tandas.reduce((s, ta) => s + ta.capacityAvailable, 0);
    if (capTotal != null && capTotal > 0 && tandas.length > 0 && sumCap > capTotal) {
      setErrors({ tandas: `La suma de cupos (${sumCap}) supera la capacidad total (${capTotal})` });
      return;
    }
    setErrors({});
    if (editingId) updateMutation.mutate({ id: editingId, data: parsed.data });
    else createMutation.mutate({ data: parsed.data, tandasToCreate: tandas });
  };

  const events = eventsData?.data ?? [];

  if (status === 'loading') return <PageContainer><PageLoader message="Cargando eventos…" /></PageContainer>;
  if (!session?.user) return <PageContainer><p className="text-text-muted">Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Panel', href: '/producer' }, { label: 'Mis eventos' }]} />
      <SectionTitle>Mis eventos</SectionTitle>
      <Button className="mt-4" onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); setTandas([]); }}>
        Crear evento
      </Button>

      <div className="mt-8 space-y-4">
        {!eventsData && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        )}
        {events.length === 0 && eventsData && (
          <EmptyState
            title="No tenés eventos"
            description="Usá el botón de arriba para crear tu primer evento."
          />
        )}
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text">{ev.title}</h3>
                  <p className="text-sm text-text-muted">{ev.city ?? ev.venueName ?? '—'} · {new Date(ev.startAt).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/producer/events/${ev.id}`} className="rounded border border-accent px-2 py-1 text-sm text-accent">Gestionar</Link>
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(ev.id); setForm({ ...defaultForm, title: ev.title, startAt: ev.startAt.slice(0, 16), city: ev.city ?? '', venueName: ev.venueName ?? '', coverImageUrl: (ev as { coverImageUrl?: string }).coverImageUrl ?? null }); setTandas([]); setShowForm(true); }}>
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? 'Editar evento' : 'Nuevo evento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Input label="Fecha inicio" type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />
          <Input label="Ciudad" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <Input label="Lugar" value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Imagen</label>
            <Input label="URL de imagen" value={form.coverImageUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, coverImageUrl: e.target.value || null }))} placeholder="https://…" />
            <label className="mt-2 block text-sm text-text-muted">O subir archivo: <input type="file" accept="image/*" onChange={handleFileChange} className="ml-2" /></label>
          </div>
          {!editingId && (
            <div className="space-y-3 rounded-lg border border-border bg-bg/50 p-4">
              <h3 className="text-sm font-medium text-text">Capacidad total (opcional)</h3>
              <Input
                label="Capacidad del recinto"
                type="number"
                min={0}
                value={form.capacityTotal ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, capacityTotal: e.target.value ? parseInt(e.target.value, 10) : null }))}
                placeholder="Ej. 500"
              />
              <h3 className="mt-4 text-sm font-medium text-text">Tandas de venta</h3>
              <p className="text-xs text-text-muted">La suma de cupos no puede superar la capacidad total.</p>
              {tandas.map((ta, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-border p-3">
                  <Input label="Nombre" value={ta.name} onChange={(e) => setTanda(i, { name: e.target.value })} placeholder="Early Bird" className="min-w-[100px]" />
                  <Input label="Precio" type="number" min={0} value={ta.price || ''} onChange={(e) => setTanda(i, { price: parseInt(e.target.value, 10) || 0 })} />
                  <Input label="Cupo" type="number" min={1} value={ta.capacityAvailable || ''} onChange={(e) => setTanda(i, { capacityAvailable: parseInt(e.target.value, 10) || 0 })} />
                  <Button type="button" size="sm" variant="secondary" onClick={() => removeTanda(i)}>Quitar</Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={addTanda}>+ Agregar tanda</Button>
              {errors.tandas && <p className="text-sm text-red-400">{errors.tandas}</p>}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Ubicación (opcional)</label>
            <Input label="Dirección" value={form.venueAddress ?? ''} onChange={(e) => setForm((p) => ({ ...p, venueAddress: e.target.value || undefined }))} placeholder="Calle, número" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input label="Lat" type="number" step="any" value={form.geoLat ?? ''} onChange={(e) => setForm((p) => ({ ...p, geoLat: e.target.value ? Number(e.target.value) : null }))} placeholder="-34.60" />
              <Input label="Lng" type="number" step="any" value={form.geoLng ?? ''} onChange={(e) => setForm((p) => ({ ...p, geoLng: e.target.value ? Number(e.target.value) : null }))} placeholder="-58.38" />
            </div>
          </div>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {editingId ? 'Guardar' : 'Crear'}
          </Button>
        </form>
      </Modal>
    </PageContainer>
  );
}
