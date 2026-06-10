'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import type { EventFormData } from '@/lib/schemas/event';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { producersKeys } from '@/lib/query/keys';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
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
import type { ProducerEventWizardStep } from '@/lib/producer/producer-event-wizard';
import {
  validateProducerEventWizardStep1,
  validateProducerEventWizardStep2,
} from '@/lib/producer/producer-event-wizard';
import { ProducerEventFormErrorSummary } from './ProducerEventFormErrorSummary';
import { ProducerEventFormFields } from './ProducerEventFormFields';
import { ProducerEventFormLayout } from './ProducerEventFormLayout';
import { ProducerEventWizardProgress } from './ProducerEventWizardProgress';
import {
  draftToCreateBody,
  earliestDraftStartIso,
  type EventDateMode,
  type OccurrenceDraft,
} from '@/lib/producer/event-occurrences';

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

  const [step, setStep] = useState<ProducerEventWizardStep>(1);
  const [form, setForm] = useState<EventFormData>(DEFAULT_EVENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [dateMode, setDateMode] = useState<EventDateMode>('simple');
  const [draftOccurrences, setDraftOccurrences] = useState<OccurrenceDraft[]>([]);

  const { data: producerProfile } = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
  });

  const coverUploadConfig = useMemo((): GcsImageUploadConfig | undefined => {
    if (!producerProfile?.id) return undefined;
    return { scope: 'producer', entityId: producerProfile.id };
  }, [producerProfile?.id]);

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
      const multiStart = earliestDraftStartIso(draftOccurrences);
      return repos.events.create({
        tenantId: t,
        producerId: PRODUCER_ID,
        eventMode: mode,
        title: data.title,
        description,
        startAt:
          dateMode === 'multi' && multiStart
            ? multiStart
            : new Date(data.startAt).toISOString(),
        endAt:
          dateMode === 'multi'
            ? null
            : data.endAt
              ? new Date(data.endAt).toISOString()
              : null,
        city: loc.city,
        venueAddress: loc.venueAddress,
        province: loc.province,
        googlePlaceId: loc.googlePlaceId,
        geoLat: loc.geoLat,
        geoLng: loc.geoLng,
        venueName: data.venueName || null,
        capacityTotal: data.capacityTotal ?? null,
        coverImageUrl: data.coverImageUrl || null,
        category: 'event',
        subcategoryId: subcategoryId || null,
        tagIds: tagIds.length ? tagIds : undefined,
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
    onSuccess: async (event) => {
      if (dateMode === 'multi' && draftOccurrences.length > 0) {
        const venue = {
          venueName: form.venueName,
          city: eventFieldsFromLocationValue(location).city,
        };
        try {
          for (const draft of draftOccurrences) {
            await repos.events.createEventOccurrence(
              event.id,
              draftToCreateBody(draft, venue),
            );
          }
        } catch (err) {
          addToast(
            `Evento creado, pero hubo un error al guardar fechas: ${getErrorMessage(err)}`,
            'error',
          );
          router.push(`/producer/events/${event.id}/edit`);
          return;
        }
      }
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

  const scrollToErrors = () => {
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goNext = () => {
    setFormError(null);
    if (step === 1) {
      const v = validateProducerEventWizardStep1(form);
      if (!v.ok) {
        setErrors(v.errors);
        scrollToErrors();
        return;
      }
    }
    if (step === 2) {
      const v = validateProducerEventWizardStep2(form, location, {
        dateMode,
        draftOccurrences,
      });
      if (!v.ok) {
        setErrors(v.errors);
        scrollToErrors();
        return;
      }
    }
    setErrors({});
    setStep((s) => (s < 3 ? ((s + 1) as ProducerEventWizardStep) : s));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validated = validateProducerEventForm(form);
    if (!validated.ok) {
      setErrors(validated.errors);
      scrollToErrors();
      return;
    }
    setErrors({});
    createMutation.mutate(validated.data);
  };

  const footer = (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setErrors({});
              setStep((s) => (s > 1 ? ((s - 1) as ProducerEventWizardStep) : s));
            }}
          >
            Atrás
          </Button>
        ) : (
          <Link href="/producer/events/new" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full">
              Cambiar modo
            </Button>
          </Link>
        )}
        <Link href="/producer/events" className="w-full sm:w-auto">
          <Button type="button" variant="outline" className="w-full">
            Cancelar
          </Button>
        </Link>
      </div>
      {step < 3 ? (
        <Button type="button" onClick={goNext} className="w-full sm:w-auto">
          Siguiente
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={createMutation.isPending || isUploadingCover}
          className="w-full sm:w-auto"
        >
          {createMutation.isPending
            ? 'Guardando…'
            : isTicketed
              ? 'Crear evento (borrador)'
              : 'Crear publicación (borrador)'}
        </Button>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="pb-16">
      <ProducerEventWizardProgress currentStep={step} />
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
          tagIds={tagIds}
          onTagIdsChange={setTagIds}
          errors={errors}
          uploadConfig={coverUploadConfig}
          onUploadingChange={setIsUploadingCover}
          completenessItems={completenessItems}
          wizardStep={step}
          dateMode={dateMode}
          onDateModeChange={setDateMode}
          draftOccurrences={draftOccurrences}
          onDraftOccurrencesChange={setDraftOccurrences}
        />
      </ProducerEventFormLayout>
    </form>
  );
}
