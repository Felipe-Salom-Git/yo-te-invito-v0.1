'use client';

import type { ChangeEvent } from 'react';
import { Input } from '@/components';
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
import { ProducerEventFormCompleteness } from './ProducerEventFormCompleteness';

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
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  apiStatus?: string | null;
  completenessItems: EventFormCompletenessItem[];
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
  onFileSelect,
  apiStatus,
  completenessItems,
}: ProducerEventFormFieldsProps) {
  const set = (patch: Partial<EventFormData>) =>
    onFormChange((p) => ({ ...p, ...patch }));

  const isTicketed = mode === 'TICKETED';
  const statusUpper = (apiStatus ?? 'DRAFT').toUpperCase();
  const canChangeStatus =
    variant === 'edit' && (statusUpper === 'DRAFT' || statusUpper === 'PENDING');
  const statusHint = statusHintForProducerForm(apiStatus ?? form.status, mode);

  return (
    <div className="space-y-6">
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
        <Input
          label="Resumen corto"
          value={form.summary ?? ''}
          onChange={(e) => set({ summary: e.target.value })}
          error={errors.summary}
          placeholder="Hasta 220 caracteres para listados y cards"
        />
        <FieldHint>
          Opcional pero recomendado. Si no completás resumen, podés usar solo la descripción larga.
        </FieldHint>
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

      <FormSection
        id="bloque-imagen"
        title="3. Imagen y presentación"
        description="La portada es lo primero que ve el público. Usá una imagen horizontal, buena luz y sin texto ilegible."
      >
        <Input
          label="URL de la imagen"
          value={form.coverImageUrl ?? ''}
          onChange={(e) => set({ coverImageUrl: e.target.value || null })}
          error={errors.coverImageUrl}
          placeholder="https://…"
        />
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg p-6 text-sm text-text-muted transition-colors hover:border-accent sm:p-8">
          <span>Subir imagen desde tu dispositivo</span>
          <span className="mt-1 text-xs">JPG o PNG, recomendado 16:9</span>
          <input
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            className="hidden"
          />
        </label>
        {form.coverImageUrl ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.coverImageUrl}
              alt="Vista previa de portada"
              className="max-h-48 w-full object-cover"
            />
          </div>
        ) : null}
      </FormSection>

      <FormSection
        id="bloque-comercial"
        title="4. Configuración comercial"
        description={
          isTicketed
            ? 'Las entradas, precios y tandas se configuran después de crear la ficha, desde la gestión del evento.'
            : 'Este evento es solo publicidad: no habilita venta de entradas en la plataforma.'
        }
      >
        {isTicketed ? (
          <>
            <div className="rounded-lg border border-border/80 bg-bg p-4 text-sm text-text-muted">
              <p>
                <span className="font-medium text-text">Entradas y tandas</span> — las definís en el
                paso siguiente, sin perder lo que cargaste acá. Podés crear tipos de entrada,
                tandas y diseño de ticket cuando el evento esté en borrador o aprobado.
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

      <FormSection
        id="bloque-publicacion"
        title="5. Estado y publicación"
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
      </FormSection>
    </div>
  );
}
