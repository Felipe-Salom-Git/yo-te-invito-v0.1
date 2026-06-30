'use client';

import { useState } from 'react';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from '@yo-te-invito/shared';
import { Button, Input, SectionTitle } from '@/components';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import { FieldCharacterCounter } from '@/components/forms/FieldCharacterCounter';
import type { GastroDiscountCreatePayload } from '@/repositories/interfaces';

const GASTRO_DISCOUNT_SUMMARY_MAX = 500;

const WEEKDAY_OPTIONS: Array<{ value: GastroWeekday; label: string }> = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

type ValidityMode = 'DATE_RANGE' | 'WEEKLY_RECURRING';

type Props = {
  initial?: {
    title: string;
    summary: string;
    detail: string;
    discountDate?: string | null;
    validityMode?: ValidityMode;
    validWeekday?: GastroWeekday | null;
    imageUrls?: string[];
  };
  onSubmit: (payload: GastroDiscountCreatePayload) => void;
  submitting?: boolean;
  /** GastroProfile.id — required for GCS uploads. */
  gastroProfileId?: string;
  mode?: 'create' | 'edit';
};

export function GastroDiscountForm({
  initial,
  onSubmit,
  submitting,
  gastroProfileId,
  mode = 'create',
}: Props) {
  const isEdit = mode === 'edit';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [images, setImages] = useState({
    headerImageUrl: '',
    galleryImageUrls: initial?.imageUrls ?? [],
  });
  const [validityMode, setValidityMode] = useState<ValidityMode>(
    initial?.validityMode ?? 'DATE_RANGE',
  );
  const [discountDate, setDiscountDate] = useState(
    initial?.discountDate ? initial.discountDate.slice(0, 10) : '',
  );
  const [validWeekday, setValidWeekday] = useState<GastroWeekday>(
    initial?.validWeekday ?? 'WEDNESDAY',
  );
  const [accepted, setAccepted] = useState(isEdit);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const uploadConfig: GcsImageUploadConfig | undefined = gastroProfileId
    ? { scope: 'gastro', entityId: gastroProfileId }
    : undefined;

  const isWeekly = validityMode === 'WEEKLY_RECURRING';
  const validityReady = isWeekly ? Boolean(validWeekday) : Boolean(discountDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageUrls = images.galleryImageUrls.filter(Boolean);
    if (!accepted || !title.trim() || !summary.trim() || !detail.trim() || !validityReady) return;
    if (imageUrls.length === 0) return;

    const payload: GastroDiscountCreatePayload = {
      title: title.trim(),
      summary: summary.trim(),
      detail: detail.trim(),
      imageUrls,
      validityMode,
      commissionCoordinationAccepted: true,
    };

    if (isWeekly) {
      payload.validWeekday = validWeekday;
    } else {
      payload.discountDate = new Date(`${discountDate}T12:00:00`).toISOString();
    }

    onSubmit(payload);
  };

  const imageUrls = images.galleryImageUrls.filter(Boolean);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionTitle>Ticket de descuento</SectionTitle>
      <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div>
        <label className="mb-1 block text-sm text-text-muted">Resumen</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={2}
          value={summary}
          onChange={(e) =>
            setSummary(e.target.value.slice(0, GASTRO_DISCOUNT_SUMMARY_MAX))
          }
          maxLength={GASTRO_DISCOUNT_SUMMARY_MAX}
          required
          aria-describedby="gastro-discount-summary-counter"
        />
        <FieldCharacterCounter
          id="gastro-discount-summary-counter"
          current={summary.length}
          max={GASTRO_DISCOUNT_SUMMARY_MAX}
          className="mt-1"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Detalle</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={4}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          required
        />
      </div>
      <RentalProductImagesForm
        value={images}
        onChange={setImages}
        galleryOnly
        uploadConfig={uploadConfig}
        onUploadingChange={setIsUploadingImages}
      />
      {imageUrls.length === 0 && (
        <p className="text-sm text-amber-400">Agregá al menos una imagen para el ticket.</p>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-1 block text-sm font-medium text-text">Tipo de validez</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="radio"
              name="validityMode"
              checked={validityMode === 'DATE_RANGE'}
              onChange={() => setValidityMode('DATE_RANGE')}
            />
            Por fecha / rango
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="radio"
              name="validityMode"
              checked={validityMode === 'WEEKLY_RECURRING'}
              onChange={() => setValidityMode('WEEKLY_RECURRING')}
            />
            Recurrente semanal
          </label>
        </div>
      </fieldset>

      {isWeekly ? (
        <div className="space-y-2">
          <label className="mb-1 block text-sm text-text-muted">Día válido</label>
          <select
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={validWeekday}
            onChange={(e) => setValidWeekday(e.target.value as GastroWeekday)}
            required
          >
            {WEEKDAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-text-muted">
            Este descuento se podrá usar solo los {GASTRO_WEEKDAY_LABELS_ES[validWeekday]} y se
            repetirá hasta que lo desactives.
          </p>
        </div>
      ) : (
        <Input
          label="Fecha del descuento"
          type="date"
          value={discountDate}
          onChange={(e) => setDiscountDate(e.target.value)}
          required
        />
      )}

      {!isEdit ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-200">Importante</p>
          <p className="mt-2 text-text-muted">
            Este servicio requiere coordinación con administración. Una vez enviado el ticket de
            descuento, nuestro equipo se comunicará con vos para coordinar el costo de comisión antes
            de aprobarlo y activarlo.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              Entiendo que administración se comunicará conmigo para coordinar la comisión antes de
              activar el ticket de descuento.
            </span>
          </label>
        </div>
      ) : null}
      <Button
        type="submit"
        disabled={!accepted || submitting || isUploadingImages || imageUrls.length === 0 || !validityReady}
      >
        {isEdit ? 'Guardar cambios' : 'Enviar ticket de descuento a revisión'}
      </Button>
    </form>
  );
}
