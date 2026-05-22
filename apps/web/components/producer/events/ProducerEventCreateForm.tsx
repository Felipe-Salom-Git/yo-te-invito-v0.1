'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import type { EventFormData } from '@/lib/schemas/event';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  EMPTY_LOCATION_VALUE,
  eventFieldsFromLocationValue,
  type LocationValue,
} from '@/components/location';
import type { ProducerEventMode } from '@/lib/producer/event-mode';
import {
  computeEventFormCompleteness,
  DEFAULT_EVENT_FORM,
  validateProducerEventForm,
} from '@/lib/producer/producer-event-form.utils';
import { ProducerEventFormErrorSummary } from './ProducerEventFormErrorSummary';
import { ProducerEventFormFields } from './ProducerEventFormFields';
import { ProducerEventFormLayout } from './ProducerEventFormLayout';

export function ProducerEventCreateForm({ mode }: { mode: ProducerEventMode }) {
  const router = useRouter();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';
  const errorRef = useRef<HTMLDivElement>(null);

  const isTicketed = mode === 'TICKETED';
  const modeLabel = isTicketed ? 'Con ticketera' : 'Solo publicidad';

  const [form, setForm] = useState<EventFormData>(DEFAULT_EVENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);

  const completenessItems = useMemo(
    () => computeEventFormCompleteness(form, location, subcategoryId),
    [form, location, subcategoryId],
  );

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const loc = eventFieldsFromLocationValue(location);
      const description =
        data.description?.trim() ||
        data.summary?.trim() ||
        null;
      return repos.events.create({
        tenantId: t,
        producerId: PRODUCER_ID,
        eventMode: mode,
        title: data.title,
        description,
        startAt: new Date(data.startAt).toISOString(),
        endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
        city: loc.city,
        venueAddress: loc.venueAddress,
        geoLat: loc.geoLat,
        geoLng: loc.geoLng,
        venueName: data.venueName || null,
        capacityTotal: data.capacityTotal ?? null,
        coverImageUrl: data.coverImageUrl || null,
        category: 'event',
        subcategoryId: subcategoryId || null,
        media: data.coverImageUrl
          ? [
              {
                id: `img-${Date.now()}`,
                type: 'image',
                url: data.coverImageUrl,
                sortOrder: 0,
              },
            ]
          : [],
      });
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
      addToast(msg, 'error');
    },
    onSuccess: (event) => {
      addToast(
        isTicketed
          ? 'Evento creado en borrador. Configurá entradas cuando quieras.'
          : 'Publicación creada en borrador.',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
      router.push(`/producer/events/${event.id}?welcome=1`);
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
    setFormError(null);
    const validated = validateProducerEventForm(form);
    if (!validated.ok) {
      setErrors(validated.errors);
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setErrors({});
    createMutation.mutate(validated.data);
  };

  const footer = (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-4">
      <Link href="/producer/events/new" className="sm:mr-auto">
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Cambiar modo
        </Button>
      </Link>
      <Link href="/producer/events">
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Cancelar
        </Button>
      </Link>
      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full sm:w-auto"
      >
        {createMutation.isPending
          ? 'Guardando…'
          : isTicketed
            ? 'Crear evento (borrador)'
            : 'Crear publicación (borrador)'}
      </Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="pb-16">
      <div ref={errorRef}>
        <ProducerEventFormErrorSummary errors={errors} formError={formError} />
      </div>

      <ProducerEventFormLayout
        form={form}
        location={location}
        modeLabel={modeLabel}
        footer={footer}
      >
        <ProducerEventFormFields
          variant="create"
          mode={mode}
          form={form}
          onFormChange={setForm}
          location={location}
          onLocationChange={setLocation}
          subcategoryId={subcategoryId}
          onSubcategoryChange={setSubcategoryId}
          errors={errors}
          onFileSelect={handleFileChange}
          completenessItems={completenessItems}
        />
      </ProducerEventFormLayout>
    </form>
  );
}
