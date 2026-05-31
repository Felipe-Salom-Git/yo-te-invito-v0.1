'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useProducerId } from '@/hooks/useProducerId';
import type { EventFormData } from '@/lib/schemas/event';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { locationValueFromEventFields, type LocationValue } from '@/components/location';
import { deriveEventModeFromEvent } from '@/lib/producer/event-mode';
import type { EventDetail } from '@/repositories/interfaces';
import {
  buildUpdatePayload,
  computeEventFormCompleteness,
  eventDetailToFormData,
  validateProducerEventForm,
} from '@/lib/producer/producer-event-form.utils';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import { ProducerEventFormErrorSummary } from './ProducerEventFormErrorSummary';
import { ProducerEventFormFields } from './ProducerEventFormFields';
import { ProducerEventFormLayout } from './ProducerEventFormLayout';

type Props = {
  eventId: string;
  eventData: EventDetail;
};

export function ProducerEventEditForm({ eventId, eventData }: Props) {
  const router = useRouter();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const PRODUCER_ID = useProducerId();
  const { addToast } = useToast();
  const errorRef = useRef<HTMLDivElement>(null);

  const mode = deriveEventModeFromEvent(eventData);
  const isTicketed = mode === 'TICKETED';
  const modeLabel = isTicketed ? 'Con ticketera' : 'Solo publicidad';
  const statusUpper = (eventData.status ?? 'DRAFT').toUpperCase();
  const canChangeStatus = statusUpper === 'DRAFT' || statusUpper === 'PENDING';

  const [form, setForm] = useState<EventFormData>(() => eventDetailToFormData(eventData));
  const [location, setLocation] = useState<LocationValue>(() =>
    locationValueFromEventFields(eventData),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState(eventData.subcategoryId ?? '');
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const coverUploadConfig = useMemo(
    (): GcsImageUploadConfig => ({ scope: 'event', entityId: eventId }),
    [eventId],
  );

  useEffect(() => {
    setForm(eventDetailToFormData(eventData));
    setLocation(locationValueFromEventFields(eventData));
    setSubcategoryId(eventData.subcategoryId ?? '');
  }, [eventData]);

  const completenessItems = useMemo(
    () => computeEventFormCompleteness(form, location, subcategoryId),
    [form, location, subcategoryId],
  );

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const payload = buildUpdatePayload(data, location, subcategoryId);
      if (!canChangeStatus) {
        const { status: _s, ...rest } = payload;
        return repos.events.update(eventId, rest);
      }
      return repos.events.update(eventId, payload);
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      setFormError(msg);
      addToast(msg, 'error');
    },
    onSuccess: () => {
      addToast('Cambios guardados correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', 'producer', eventId] });
      router.push(`/producer/events/${eventId}?saved=1`);
    },
  });

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
    updateMutation.mutate(validated.data);
  };

  const footer = (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
      <Link href={`/producer/events/${eventId}`} className="sm:mr-auto">
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Volver al evento
        </Button>
      </Link>
      <Button
        type="submit"
        disabled={updateMutation.isPending || isUploadingCover}
        className="w-full sm:w-auto"
      >
        {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
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
          variant="edit"
          mode={mode}
          form={form}
          onFormChange={setForm}
          location={location}
          onLocationChange={setLocation}
          subcategoryId={subcategoryId}
          onSubcategoryChange={setSubcategoryId}
          errors={errors}
          uploadConfig={coverUploadConfig}
          onUploadingChange={setIsUploadingCover}
          apiStatus={eventData.status}
          completenessItems={completenessItems}
        />
      </ProducerEventFormLayout>
    </form>
  );
}
