'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { eventFormSchema, type EventFormData } from '@/lib/schemas/event';
import { Button, Input, useToast } from '@/components';
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
import {
  EMPTY_LOCATION_VALUE,
  EventLocationFields,
  eventFieldsFromLocationValue,
  type LocationValue,
} from '@/components/location';
import type { ProducerEventMode } from '@/lib/producer/event-mode';
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

export function ProducerEventCreateForm({ mode }: { mode: ProducerEventMode }) {
  const router = useRouter();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';

  const isTicketed = mode === 'TICKETED';

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
    isTicketingEnabled: false,
    status: 'draft',
  };

  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [includeInitialTicketType, setIncludeInitialTicketType] = useState(isTicketed);
  const [initialTicketTypeForm, setInitialTicketTypeForm] = useState<TicketTypeEditForm>(() =>
    defaultInitialTicketTypeForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subcategoryId, setSubcategoryId] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);

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
        eventMode: mode,
        title: data.title,
        description: data.description || null,
        startAt: data.startAt ? new Date(data.startAt).toISOString() : new Date().toISOString(),
        endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
        ...(() => {
          const loc = eventFieldsFromLocationValue(location);
          return {
            city: loc.city,
            venueAddress: loc.venueAddress,
            geoLat: loc.geoLat,
            geoLng: loc.geoLng,
          };
        })(),
        venueName: data.venueName || null,
        capacityTotal: data.capacityTotal ?? null,
        coverImageUrl: data.coverImageUrl || null,
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
      addToast(
        isTicketed
          ? 'Tu evento con ticketera fue creado correctamente. Ya podés gestionar entradas, tandas y métricas de venta.'
          : 'Tu publicación fue creada correctamente. Será visible según el estado de aprobación, sin venta de entradas.',
        'success',
      );
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
    if (isTicketed && includeInitialTicketType) {
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
    setErrors((prev) => {
      const next = { ...prev };
      delete next.initialTicketType;
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">
          Información principal
        </h3>
        <Input
          label="Título del evento"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
          placeholder="Ej: Fiesta Bresh - Edición Invierno"
        />
        <Input
          label="Resumen (opcional)"
          value={form.description?.slice(0, 220) ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Breve descripción para listados"
        />
        <Input
          label="Fecha y hora de inicio"
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
        />
        <Input
          label="Lugar (venue)"
          value={form.venueName}
          onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))}
          placeholder="Ej: Estadio GEBA"
        />
        <SubcategorySelect category="event" value={subcategoryId} onChange={setSubcategoryId} />
        <div className="pt-2">
          <label className="mb-1.5 block text-sm font-medium text-text">Imagen de portada</label>
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

      {isTicketed ? (
        <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
          <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">
            Entradas y capacidad
          </h3>
          <p className="text-sm text-text-muted">
            Configurá la capacidad del recinto y, si querés, un tipo de entrada inicial con sus tandas.
          </p>
          <Input
            label="Capacidad máxima del recinto (opcional)"
            type="number"
            min={0}
            value={form.capacityTotal ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                capacityTotal: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
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
                  Recomendado para habilitar la venta y aparecer en Destacados cuando el evento esté
                  aprobado y con entradas activas.
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
          ) : (
            <p className="text-sm text-text-muted">
              Podés agregar tipos de entrada después desde la gestión del evento.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-bg p-4 text-sm text-text-muted">
          Este evento se publicará como <span className="font-medium text-text">Solo publicidad</span>.
          No incluye venta de entradas ni ticketera.
        </div>
      )}

      <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Ubicación</h3>
        <EventLocationFields value={location} onChange={setLocation} />
      </div>

      <div className="flex justify-end gap-4 pt-6 pb-20">
        <Link href="/producer/events/new">
          <Button type="button" variant="outline" className="px-8">
            Cambiar modo
          </Button>
        </Link>
        <Link href="/producer/events">
          <Button type="button" variant="outline" className="px-8">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={createMutation.isPending} className="px-8">
          {createMutation.isPending
            ? 'Guardando…'
            : isTicketed
              ? 'Crear evento con ticketera'
              : 'Crear publicación'}
        </Button>
      </div>
    </form>
  );
}
