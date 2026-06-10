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
  validateProducerEventSubmit,
} from '@/lib/producer/producer-event-form.utils';
import type { ProducerEventWizardStep } from '@/lib/producer/producer-event-wizard';
import {
  validateProducerEventWizardStep1,
  validateProducerEventWizardStep2,
} from '@/lib/producer/producer-event-wizard';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import { ProducerEventFormErrorSummary } from './ProducerEventFormErrorSummary';
import { ProducerEventFormFields } from './ProducerEventFormFields';
import { ProducerEventFormLayout } from './ProducerEventFormLayout';
import { ProducerEventWizardProgress } from './ProducerEventWizardProgress';
import { tagIdsFromEvent } from '@/components/content-tags/ContentTagSelector';
import type { EventDateMode, OccurrenceDraft } from '@/lib/producer/event-occurrences';

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
  const modeLabel = mode === 'TICKETED' ? 'Con ticketera' : 'Solo publicidad';
  const statusUpper = (eventData.status ?? 'DRAFT').toUpperCase();
  const canChangeStatus = statusUpper === 'DRAFT' || statusUpper === 'PENDING';

  const [step, setStep] = useState<ProducerEventWizardStep>(1);
  const [form, setForm] = useState<EventFormData>(() => eventDetailToFormData(eventData));
  const [location, setLocation] = useState<LocationValue>(() =>
    locationValueFromEventFields(eventData),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState(eventData.subcategoryId ?? '');
  const [tagIds, setTagIds] = useState<string[]>(() => tagIdsFromEvent(eventData));
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [dateMode, setDateMode] = useState<EventDateMode>(() =>
    eventData.isMultiDate ? 'multi' : 'simple',
  );
  const [draftOccurrences, setDraftOccurrences] = useState<OccurrenceDraft[]>([]);
  const [legalAccepted, setLegalAccepted] = useState(true);

  const coverUploadConfig = useMemo(
    (): GcsImageUploadConfig => ({ scope: 'event', entityId: eventId }),
    [eventId],
  );

  useEffect(() => {
    setForm(eventDetailToFormData(eventData));
    setLocation(locationValueFromEventFields(eventData));
    setSubcategoryId(eventData.subcategoryId ?? '');
    setTagIds(tagIdsFromEvent(eventData));
    setDateMode(eventData.isMultiDate ? 'multi' : 'simple');
  }, [eventData]);

  const completenessItems = useMemo(
    () => computeEventFormCompleteness(form, location, subcategoryId),
    [form, location, subcategoryId],
  );

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const payload = { ...buildUpdatePayload(data, location, subcategoryId), tagIds };
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

  const submittingForReview = form.status === 'pending';
  const legalBlocksSubmit = submittingForReview && !legalAccepted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (legalBlocksSubmit) {
      const msg =
        'Debés aceptar las condiciones para productoras antes de enviar el evento a revisión.';
      setFormError(msg);
      addToast(msg, 'error');
      scrollToErrors();
      return;
    }
    const validated = validateProducerEventSubmit(form, location);
    if (!validated.ok) {
      setErrors(validated.errors);
      scrollToErrors();
      return;
    }
    const parsed = validateProducerEventForm(form);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      scrollToErrors();
      return;
    }
    setErrors({});
    updateMutation.mutate(parsed.data);
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
          <Link href={`/producer/events/${eventId}`} className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full">
              Volver al evento
            </Button>
          </Link>
        )}
      </div>
      {step < 3 ? (
        <Button type="button" onClick={goNext} className="w-full sm:w-auto">
          Siguiente
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={updateMutation.isPending || isUploadingCover || legalBlocksSubmit}
          className="w-full sm:w-auto"
        >
          {updateMutation.isPending
            ? 'Guardando…'
            : legalBlocksSubmit
              ? 'Aceptá los términos para enviar a revisión'
              : 'Guardar cambios'}
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
          variant="edit"
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
          apiStatus={eventData.status}
          completenessItems={completenessItems}
          wizardStep={step}
          eventId={eventId}
          dateMode={dateMode}
          onDateModeChange={setDateMode}
          draftOccurrences={draftOccurrences}
          onDraftOccurrencesChange={setDraftOccurrences}
          onLegalAcceptanceChange={setLegalAccepted}
        />
      </ProducerEventFormLayout>
    </form>
  );
}
