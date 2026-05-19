'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { eventFormSchema, type EventFormData } from '@/lib/schemas/event';
import { PageContainer, SectionTitle, Button, Input, useToast, Breadcrumbs } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { editFormToCreateInput } from '@/lib/producer/ticket-types-api-map';
import {
  ticketTypeEditFormToValidationDrafts,
  validateTicketTypeBatches,
} from '@/lib/producer/ticket-type-batches.validation';
import {
  emptyBatchTemplate,
  emptyBatchTemplateAfter,
  type TicketTypeEditForm,
} from '@/lib/producer/ticket-types-editor.model';
import { ticketTypesKeys } from '@/lib/query/keys';
import { ProducerTicketTypeFormFields } from '@/components/producer/ticket-types/ProducerTicketTypeFormFields';
import { ProducerTicketTypeSummaryPanel } from '@/components/producer/ticket-types/ProducerTicketTypeSummaryPanel';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import type { TicketTypeResponse } from '@/repositories/interfaces';

function defaultInitialTicketTypeForm(): TicketTypeEditForm {
  const b0 = emptyBatchTemplate(0);
  const b1 = emptyBatchTemplateAfter(b0.endAt, 1);
  return {
    name: '',
    description: '',
    capacityTotal: 20,
    maxPerOrder: 10,
    status: 'ACTIVE',
    batches: [b0, b1],
  };
}

/** Minimal shape for summary panel preview (no id, no server batches). */
function previewTicketTypeStub(form: TicketTypeEditForm): TicketTypeResponse {
  return {
    id: 'preview',
    eventId: '',
    name: form.name.trim() || 'Tipo nuevo',
    description: form.description.trim() || null,
    price: form.batches[0]?.price ?? 0,
    capacityTotal: form.capacityTotal,
    capacityAvailable: form.capacityTotal,
    maxPerOrder: form.maxPerOrder,
    status: form.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    saleStart: null,
    saleEnd: null,
    batches: [],
    activeTicketBatchId: null,
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const { status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';

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
  const [includeInitialTicketType, setIncludeInitialTicketType] = useState(false);
  const [initialTicketTypeForm, setInitialTicketTypeForm] = useState<TicketTypeEditForm>(() =>
    defaultInitialTicketTypeForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subcategoryId, setSubcategoryId] = useState('');

  const previewStub = useMemo(
    () => previewTicketTypeStub(initialTicketTypeForm),
    [initialTicketTypeForm],
  );

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      ticketTypeForm,
    }: {
      data: EventFormData;
      ticketTypeForm: TicketTypeEditForm | null;
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
        category: 'event',
        subcategoryId: subcategoryId || null,
        media: data.coverImageUrl
          ? [{ id: `img-${Date.now()}`, type: 'image', url: data.coverImageUrl, sortOrder: 0 }]
          : [],
      });

      if (ticketTypeForm) {
        await repos.ticketTypes.create(event.id, editFormToCreateInput(ticketTypeForm));
      }
      return event;
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (event) => {
      addToast('Evento creado exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
      queryClient.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(event.id) });
      queryClient.invalidateQueries({ queryKey: ticketTypesKeys.byEvent(event.id) });
      router.push(`/producer/events/${event.id}`);
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
      parsed.error.errors.forEach((err) => {
        const p = err.path[0] as string;
        if (p) errs[p] = err.message;
      });
      setErrors(errs);
      return;
    }

    let ticketPayload: TicketTypeEditForm | null = null;
    if (includeInitialTicketType) {
      if (!initialTicketTypeForm.name.trim()) {
        setErrors({ initialTicketType: 'El nombre del tipo de entrada es obligatorio.' });
        return;
      }
      const v = validateTicketTypeBatches(
        initialTicketTypeForm.capacityTotal,
        ticketTypeEditFormToValidationDrafts(initialTicketTypeForm),
      );
      if (!v.ok) {
        setErrors({ initialTicketType: v.message });
        return;
      }
      const eventCap = parsed.data.capacityTotal;
      if (eventCap != null && eventCap > 0 && initialTicketTypeForm.capacityTotal > eventCap) {
        setErrors({
          initialTicketType: `La capacidad del tipo (${initialTicketTypeForm.capacityTotal}) no puede superar la capacidad del evento (${eventCap}).`,
        });
        return;
      }
      ticketPayload = initialTicketTypeForm;
    }

    setErrors({});
    createMutation.mutate({ data: parsed.data, ticketTypeForm: ticketPayload });
  };

  const toggleInitialType = (on: boolean) => {
    setIncludeInitialTicketType(on);
    if (on) setInitialTicketTypeForm(defaultInitialTicketTypeForm());
    setErrors((e) => {
      const next = { ...e };
      delete next.initialTicketType;
      return next;
    });
  };

  if (status === 'unauthenticated') {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para continuar.</p>
        <Link href="/login" className="text-accent underline mt-2 block">
          Login
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Mis eventos', href: '/producer/events' }, { label: 'Crear Evento' }]} />

      <div className="mb-8">
        <SectionTitle>Crear Nuevo Evento</SectionTitle>
        <p className="mt-2 text-text-muted">
          Publicá una nueva fiesta o espectáculo. Podés comenzar como borrador o publicarlo directamente.
        </p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
            <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Información Principal</h3>
            <Input
              label="Título del Evento"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
              placeholder="Ej: Fiesta Bresh - Edición Invierno"
            />
            <Input
              label="Fecha y Hora de inicio"
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Ciudad"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Ej: Buenos Aires"
              />
              <Input
                label="Lugar (Venue)"
                value={form.venueName}
                onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))}
                placeholder="Ej: Estadio GEBA"
              />
            </div>

            <SubcategorySelect
              category="event"
              value={subcategoryId}
              onChange={setSubcategoryId}
            />

            <div className="pt-2">
              <label className="mb-1.5 block text-sm font-medium text-text">Imagen de Portada</label>
              <Input
                label="URL de la imagen"
                value={form.coverImageUrl ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, coverImageUrl: e.target.value || null }))}
                placeholder="https://…"
              />
              <label className="mt-3 text-sm text-text-muted cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-bg hover:border-accent transition-colors">
                <span className="mr-2">📁 Subir archivo desde tu dispositivo</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="font-semibold text-text text-lg">Entradas y capacidad</h3>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Podés definir la capacidad del recinto y, si querés, un <span className="font-medium text-text">tipo de
              entrada</span> inicial con sus <span className="font-medium text-text">tandas</span> (etapas de venta
              encadenadas). También podés cargar tipos después desde la página del evento.
            </p>

            <Input
              label="Capacidad máxima del recinto (opcional)"
              type="number"
              min={0}
              value={form.capacityTotal ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, capacityTotal: e.target.value ? parseInt(e.target.value, 10) : null }))
              }
              placeholder="Ej: 1500"
            />

            <div className="mt-4 rounded-lg border border-border bg-bg p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 accent-accent"
                  checked={includeInitialTicketType}
                  onChange={(e) => toggleInitialType(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-text">Cargar un tipo de entrada inicial</span>
                  <span className="mt-1 block text-sm text-text-muted">
                    Un tipo (ej. VIP) puede tener varias tandas con fechas y precios distintos. Si no marcás esta opción,
                    agregás tipos desde la gestión del evento.
                  </span>
                </span>
              </label>
            </div>

            {includeInitialTicketType ? (
              <div className="mt-6 space-y-4">
                <ProducerTicketTypeFormFields
                  form={initialTicketTypeForm}
                  onChange={setInitialTicketTypeForm}
                  hasSold={false}
                />
                <div className="rounded-lg border border-border/80 bg-bg-muted/50 p-3">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Vista previa</p>
                  <ProducerTicketTypeSummaryPanel
                    ticketType={previewStub}
                    draftBatches={initialTicketTypeForm.batches}
                  />
                </div>
                {errors.initialTicketType ? (
                  <p className="text-sm text-red-500 font-medium">{errors.initialTicketType}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
            <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Ubicación y Detalles</h3>

            <Input
              label="Dirección Exacta"
              value={form.venueAddress ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, venueAddress: e.target.value || undefined }))}
              placeholder="Av. Corrientes 1234, CABA"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Latitud"
                type="number"
                step="any"
                value={form.geoLat ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, geoLat: e.target.value ? Number(e.target.value) : null }))}
                placeholder="-34.6037"
              />
              <Input
                label="Longitud"
                type="number"
                step="any"
                value={form.geoLng ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, geoLng: e.target.value ? Number(e.target.value) : null }))}
                placeholder="-58.3816"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 pb-20">
            <Link href="/producer/events">
              <Button type="button" variant="outline" className="px-8">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} className="px-8">
              {createMutation.isPending ? 'Creando evento...' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
