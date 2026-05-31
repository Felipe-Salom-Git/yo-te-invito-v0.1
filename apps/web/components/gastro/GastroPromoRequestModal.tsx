'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CreateGastroPromotionRequestBody } from '@yo-te-invito/shared';
import { Button, Input } from '@/components';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';

const MAX_IMAGES = 6;

export function GastroPromoRequestModal({
  open,
  onClose,
  eventId,
  eventLabel,
  gastroProfileId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventLabel: string;
  gastroProfileId?: string;
  onSubmit: (body: CreateGastroPromotionRequestBody) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [promoNotes, setPromoNotes] = useState('');
  const [promoSuggestType, setPromoSuggestType] = useState<'PERCENT' | 'FIXED' | ''>('');
  const [promoSuggestValue, setPromoSuggestValue] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const uploadConfig = useMemo((): GcsImageUploadConfig | undefined => {
    if (!gastroProfileId) return undefined;
    return { scope: 'gastro', entityId: gastroProfileId };
  }, [gastroProfileId]);

  const { isUploading, uploadProgress, uploadFilesSequential } = useGcsImageUpload(uploadConfig);

  const reset = useCallback(() => {
    setPromoTitle('');
    setPromoDesc('');
    setContactPhone('');
    setPromoNotes('');
    setPromoSuggestType('');
    setPromoSuggestValue('');
    setImageUrls([]);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length || !uploadConfig) return;
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) return;
    const picked = Array.from(files).slice(0, remaining);
    const uploaded = await uploadFilesSequential(picked, 'content');
    if (uploaded.length > 0) {
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const phones = contactPhone
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const n = Number.parseFloat(promoSuggestValue);
    const hasSuggestion = promoSuggestType && Number.isFinite(n) && n > 0;
    const body: CreateGastroPromotionRequestBody = {
      eventId,
      promotionTitle: promoTitle.trim(),
      promotionDescription: promoDesc.trim() || undefined,
      contactPhones: phones,
      imageUrls,
      notesForAdmin: promoNotes.trim() || undefined,
      ...(hasSuggestion ? { suggestedDiscountType: promoSuggestType, suggestedValue: n } : {}),
    };
    try {
      await onSubmit(body);
      handleClose();
    } catch {
      /* error toast from parent mutation */
    }
  };

  if (!open) return null;

  const canSubmit =
    promoTitle.trim().length > 0 &&
    phonesOk(contactPhone) &&
    !isSubmitting &&
    !isUploading &&
    !!eventId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-bg p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="gastro-promo-modal-title"
      >
        <h2 id="gastro-promo-modal-title" className="text-lg font-semibold text-text">
          Solicitar nuevo cupón de descuento
        </h2>
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/95">
          <strong className="font-semibold">Importante:</strong> los descuentos se negocian con{' '}
          <span className="font-medium">administración</span>. Este formulario es una solicitud; el equipo definirá
          condiciones, vigencia y código publicado una vez aprobada.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Evento: <span className="text-text">{eventLabel}</span>
        </p>

        <Input
          label="Título de la promoción"
          value={promoTitle}
          onChange={(e) => setPromoTitle(e.target.value)}
          className="mt-4"
          placeholder="Ej. Happy hour viernes"
        />
        <div className="mt-3">
          <label className="block text-sm font-medium text-text">Descripción del descuento</label>
          <textarea
            value={promoDesc}
            onChange={(e) => setPromoDesc(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
            placeholder="Qué ofrecés, horarios, restricciones…"
          />
        </div>
        <Input
          label="Teléfono de contacto"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="011 o WhatsApp"
          className="mt-3"
        />
        <p className="mt-1 text-xs text-text-muted">Podés agregar varios separados por coma.</p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-text">
            Imágenes (opcional, hasta {MAX_IMAGES})
          </label>
          {uploadProgress ? (
            <p className="mt-1 text-sm text-accent" role="status">
              {uploadProgress}
            </p>
          ) : null}
          <input
            type="file"
            accept={IMAGE_ACCEPT_GCS}
            multiple
            disabled={isUploading || !uploadConfig || imageUrls.length >= MAX_IMAGES}
            className="mt-1 block w-full text-sm text-text-muted file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-text disabled:opacity-50"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          {imageUrls.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {imageUrls.map((src, idx) => (
                <li key={idx} className="relative h-20 w-20 overflow-hidden rounded border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white"
                    disabled={isUploading}
                    onClick={() => removeImage(idx)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Input
          label="Notas para el equipo (opcional)"
          value={promoNotes}
          onChange={(e) => setPromoNotes(e.target.value)}
          className="mt-3"
        />

        <div className="mt-4 rounded border border-border/80 bg-bg-muted/50 p-3">
          <p className="text-sm font-medium text-text">Sugerencia de descuento (opcional)</p>
          <p className="mt-1 text-xs text-text-muted">El admin puede definir otro valor al publicar el cupón.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-text-muted">Tipo</label>
              <select
                value={promoSuggestType}
                onChange={(e) => setPromoSuggestType(e.target.value as 'PERCENT' | 'FIXED' | '')}
                className="mt-0.5 rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              >
                <option value="">—</option>
                <option value="PERCENT">Porcentaje</option>
                <option value="FIXED">Monto fijo</option>
              </select>
            </div>
            <Input
              label="Valor sugerido"
              type="number"
              value={promoSuggestValue}
              onChange={(e) => setPromoSuggestValue(e.target.value)}
              className="max-w-[140px]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function phonesOk(raw: string): boolean {
  return raw
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean).length > 0;
}
