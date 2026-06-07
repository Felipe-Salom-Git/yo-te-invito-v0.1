'use client';

import { useCallback, useEffect } from 'react';
import { Input, useToast } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import {
  EventLocationFields,
  type LocationValue,
} from '@/components/location';
import type { EventFormData } from '@/lib/schemas/event';
import type { ProducerEventMode } from '@/lib/producer/event-mode';
import {
  statusHintForProducerForm,
  type EventFormCompletenessItem,
} from '@/lib/producer/producer-event-form.utils';
import { EVENT_STATUS_LABELS } from '@/lib/domainLabels';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';
import { ImageUploadHint } from '@/components/upload/ImageUploadHint';
import { isDataImageUrl } from '@/lib/upload/validate-public-image-file';
import { ProducerEventFormCompleteness } from './ProducerEventFormCompleteness';
import { ProducerEventPublicationLegalNotice } from './ProducerEventPublicationLegalNotice';
import type { ProducerEventWizardStep } from '@/lib/producer/producer-event-wizard';

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border border-border bg-bg-muted p-4 sm:p-6"
    >
      <div className="mb-4 border-b border-border pb-3">
        <h3 className="text-base font-semibold text-text sm:text-lg">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-muted">{children}</p>;
}

function TextAreaField({
  label,
  value,
  onChange,
  error,
  placeholder,
  rows = 4,
  hint,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  optional?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-text-muted">(opcional)</span>
        ) : null}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full resize-y rounded border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent-muted focus:outline-none focus:ring-1 focus:ring-accent-muted ${
          error ? 'border-red-500' : 'border-border'
        }`}
      />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export type ProducerEventFormFieldsProps = {
  variant: 'create' | 'edit';
  mode: ProducerEventMode;
  form: EventFormData;
  onFormChange: (updater: (prev: EventFormData) => EventFormData) => void;
  location: LocationValue;
  onLocationChange: (v: LocationValue) => void;
  subcategoryId: string;
  onSubcategoryChange: (id: string) => void;
  errors: Record<string, string>;
  /** GCS cover upload — create: scope producer; edit: scope event. */
  uploadConfig?: GcsImageUploadConfig;
  onUploadingChange?: (uploading: boolean) => void;
  apiStatus?: string | null;
  completenessItems: EventFormCompletenessItem[];
  /** Wizard mode: show only the active step (1–3). Omit for full scroll form. */
  wizardStep?: ProducerEventWizardStep;
};

export function ProducerEventFormFields({
  variant,
  mode,
  form,
  onFormChange,
  location,
  onLocationChange,
  subcategoryId,
  onSubcategoryChange,
  errors,
  uploadConfig,
  onUploadingChange,
  apiStatus,
  completenessItems,
  wizardStep,
}: ProducerEventFormFieldsProps) {
  const { addToast } = useToast();
  const set = (patch: Partial<EventFormData>) =>
    onFormChange((p) => ({ ...p, ...patch }));

  const { gcsMode, isUploading, uploadProgress, uploadSingleWithProgress } =
    useGcsImageUpload(uploadConfig);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const rejectDataUrlIfGcs = useCallback(
    (url: string): boolean => {
      if (gcsMode && isDataImageUrl(url)) {
        addToast(
          'Las imágenes embebidas (data-URL) no están permitidas. Subí un archivo o pegá una URL https.',
          'error',
        );
        return true;
      }
      return false;
    },
    [addToast, gcsMode],
  );

  const handleCoverFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (gcsMode) {
        const url = await uploadSingleWithProgress(file, 'cover');
        if (url) onFormChange((p) => ({ ...p, coverImageUrl: url }));
        return;
      }

      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () =>
        onFormChange((p) => ({ ...p, coverImageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    },
    [gcsMode, uploadSingleWithProgress, onFormChange],
  );

  const isTicketed = mode === 'TICKETED';
  const statusUpper = (apiStatus ?? 'DRAFT').toUpperCase();
  const canChangeStatus =
    variant === 'edit' && (statusUpper === 'DRAFT' || statusUpper === 'PENDING');
  const statusHint = statusHintForProducerForm(apiStatus ?? form.status, mode);

  const showStep = (step: ProducerEventWizardStep) => !wizardStep || wizardStep === step;

  return (
    <div className="space-y-6">
      {showStep(1) ? (
      <FormSection
        id="bloque-datos"
        title="1. Datos básicos"
        description="Título y textos que verán los asistentes en listados y en la ficha pública."
      >
        <Input
          label="Título del evento"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          required
          error={errors.title}
          placeholder="Ej: Fiesta Bresh — Edición Invierno"
        />
        <RentalSummaryField
          label="Resumen corto"
          hint="Opcional pero recomendado para listados y cards. Si no completás resumen, podés usar solo la descripción larga."
          value={form.summary ?? ''}
          onChange={(summary) => set({ summary })}
        />
        {errors.summary ? <p className="text-sm text-red-400">{errors.summary}</p> : null}
        <TextAreaField
          label="Descripción completa"
          optional
          value={form.description ?? ''}
          onChange={(v) => set({ description: v })}
          error={errors.description}
          placeholder="Detalle del evento, artistas, dress code, etc."
          rows={5}
        />
        <SubcategorySelect
          category="event"
          value={subcategoryId}
          onChange={onSubcategoryChange}
        />
        <FieldHint>La subcategoría ayuda a clasificar el evento en búsquedas (opcional).</FieldHint>
      </FormSection>
      ) : null}

      {showStep(2) ? (
      <FormSection
        id="bloque-fecha"
        title="2. Fecha y ubicación"
        description="Cuándo y dónde se realiza. La dirección y el mapa mejoran la experiencia del público."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Fecha y hora de inicio"
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => set({ startAt: e.target.value })}
            required
            error={errors.startAt}
          />
          <Input
            label="Fecha y hora de fin"
            type="datetime-local"
            value={form.endAt ?? ''}
            onChange={(e) => set({ endAt: e.target.value })}
            error={errors.endAt}
          />
        </div>
        <FieldHint>La fecha de fin es opcional (eventos de un solo bloque horario).</FieldHint>
        <Input
          label="Nombre del lugar"
          value={form.venueName ?? ''}
          onChange={(e) => set({ venueName: e.target.value })}
          error={errors.venueName}
          placeholder="Ej: Estadio GEBA, Club XYZ"
        />
        <EventLocationFields value={location} onChange={onLocationChange} />
        {errors.city ? (
          <p className="text-sm text-red-400">{errors.city}</p>
        ) : null}
        {errors.venueAddress ? (
          <p className="text-sm text-red-400">{errors.venueAddress}</p>
        ) : null}
      </FormSection>
      ) : null}

      {showStep(2) ? (
      <FormSection
        id="bloque-comercial"
        title="Entradas y condiciones"
        description={
          isTicketed
            ? 'Capacidad de referencia. Las tandas y precios se configuran después de guardar la ficha.'
            : 'Este evento es solo publicidad: no habilita venta de entradas en la plataforma.'
        }
      >
        {isTicketed ? (
          <>
            <div className="rounded-lg border border-border/80 bg-bg p-4 text-sm text-text-muted">
              <p>
                <span className="font-medium text-text">Entradas y tandas</span> — las definís en la
                gestión del evento después de crear o guardar este borrador.
              </p>
            </div>
            <Input
              label="Capacidad máxima del recinto"
              type="number"
              min={0}
              value={form.capacityTotal ?? ''}
              onChange={(e) =>
                set({
                  capacityTotal: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              error={errors.capacityTotal}
              placeholder="Ej: 1500 (opcional)"
            />
            <FieldHint>
              Referencia para planificar cupos; los límites por tipo de entrada se configuran aparte.
            </FieldHint>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            Modo <span className="font-medium text-text">Solo publicidad</span>: visible según
            aprobación, sin ticketera ni venta de entradas en Yo Te Invito.
          </p>
        )}
      </FormSection>
      ) : null}

      {showStep(3) ? (
      <FormSection
        id="bloque-imagen"
        title="3. Imagen y presentación"
        description="La portada es lo primero que ve el público. Usá una imagen horizontal, buena luz y sin texto ilegible."
      >
        {uploadProgress ? (
          <p className="text-sm text-accent" role="status">
            {uploadProgress}
          </p>
        ) : null}
        <ImageUploadHint variant="cover" options={{ gcs: gcsMode }} />
        <Input
          label="URL de la imagen"
          value={form.coverImageUrl ?? ''}
          onChange={(e) => {
            const url = e.target.value;
            if (rejectDataUrlIfGcs(url)) return;
            set({ coverImageUrl: url || null });
          }}
          error={errors.coverImageUrl}
          placeholder="https://…"
          disabled={isUploading}
        />
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg p-6 text-sm text-text-muted transition-colors hover:border-accent disabled:opacity-50 sm:p-8">
          <span>Subir imagen desde tu dispositivo</span>
          <span className="mt-1 text-xs">Elegí un archivo desde tu dispositivo</span>
          <input
            type="file"
            accept={gcsMode ? IMAGE_ACCEPT_GCS : 'image/*'}
            onChange={handleCoverFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
        {form.coverImageUrl ? (
          <ImageUrlPreview url={form.coverImageUrl} className="max-h-48 w-full object-cover" />
        ) : null}
      </FormSection>
      ) : null}

      {showStep(3) ? (
      <FormSection
        id="bloque-publicacion"
        title="Revisión y publicación"
        description="Guardá como borrador mientras armás la ficha. Cuando esté completa, enviala a revisión del equipo."
      >
        <ProducerEventFormCompleteness items={completenessItems} />

        {variant === 'create' ? (
          <div className="rounded-lg border border-border bg-bg p-4 text-sm text-text-muted">
            Al crear, el evento queda en{' '}
            <span className="font-medium text-text">borrador</span>. Después podés enviarlo a
            revisión desde la edición o cuando el equipo lo habilite.
          </div>
        ) : canChangeStatus ? (
          <div>
            <label
              htmlFor="event-status"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Estado del evento
            </label>
            <select
              id="event-status"
              value={form.status}
              onChange={(e) =>
                set({ status: e.target.value as EventFormData['status'] })
              }
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent-muted focus:outline-none focus:ring-1 focus:ring-accent-muted"
            >
              <option value="draft">{EVENT_STATUS_LABELS.DRAFT}</option>
              <option value="pending">Enviar a revisión ({EVENT_STATUS_LABELS.PENDING})</option>
            </select>
            {errors.status ? (
              <p className="mt-1 text-sm text-red-400">{errors.status}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-text">
            Estado actual:{' '}
            <span className="font-medium">
              {EVENT_STATUS_LABELS[statusUpper] ?? statusUpper}
            </span>
          </p>
        )}

        {statusHint ? (
          <p className="text-sm text-text-muted">{statusHint}</p>
        ) : null}

        <ProducerEventPublicationLegalNotice />
      </FormSection>
      ) : null}
    </div>
  );
}
