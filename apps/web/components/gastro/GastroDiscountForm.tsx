'use client';

import { useState } from 'react';
import { Button, Input, SectionTitle } from '@/components';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import { FieldCharacterCounter } from '@/components/forms/FieldCharacterCounter';
import type { GastroDiscountCreatePayload } from '@/repositories/interfaces';

const GASTRO_DISCOUNT_SUMMARY_MAX = 500;

type Props = {
  initial?: {
    title: string;
    summary: string;
    detail: string;
    discountDate: string;
    imageUrls?: string[];
  };
  onSubmit: (payload: GastroDiscountCreatePayload) => void;
  submitting?: boolean;
  /** GastroProfile.id — required for GCS uploads. */
  gastroProfileId?: string;
};

export function GastroDiscountForm({ initial, onSubmit, submitting, gastroProfileId }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [images, setImages] = useState({
    headerImageUrl: '',
    galleryImageUrls: initial?.imageUrls ?? [],
  });
  const [discountDate, setDiscountDate] = useState(
    initial?.discountDate ? initial.discountDate.slice(0, 10) : '',
  );
  const [accepted, setAccepted] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const uploadConfig: GcsImageUploadConfig | undefined = gastroProfileId
    ? { scope: 'gastro', entityId: gastroProfileId }
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageUrls = images.galleryImageUrls.filter(Boolean);
    if (!accepted || !title.trim() || !summary.trim() || !detail.trim() || !discountDate) return;
    if (imageUrls.length === 0) return;
    const iso = new Date(`${discountDate}T12:00:00`).toISOString();
    onSubmit({
      title: title.trim(),
      summary: summary.trim(),
      detail: detail.trim(),
      imageUrls,
      discountDate: iso,
      commissionCoordinationAccepted: true,
    });
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
      <Input
        label="Fecha del descuento"
        type="date"
        value={discountDate}
        onChange={(e) => setDiscountDate(e.target.value)}
        required
      />
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
      <Button
        type="submit"
        disabled={!accepted || submitting || isUploadingImages || imageUrls.length === 0}
      >
        Enviar ticket de descuento a revisión
      </Button>
    </form>
  );
}
