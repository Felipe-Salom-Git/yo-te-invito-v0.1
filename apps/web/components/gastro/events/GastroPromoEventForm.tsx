'use client';

import { useState } from 'react';
import { GASTRO_PROMO_EVENT_GALLERY_MAX } from '@yo-te-invito/shared';
import { Button, Input } from '@/components';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import { ContentTagSelector } from '@/components/content-tags/ContentTagSelector';
import { GastroContentGalleryField } from '@/components/gastro/GastroContentGalleryField';
import {
  buildGastroPromoEventPayload,
  type GastroPromoEventFormResult,
  type GastroPromoEventFormState,
} from '@/lib/gastro/gastroPromoEvents';

type Payload = Extract<GastroPromoEventFormResult, { ok: true }>['data'];

type Props = {
  initial: GastroPromoEventFormState;
  local: { id: string; displayName: string; address: string | null };
  /** Create: «Guardar borrador» + «Enviar a revisión». Edit: «Guardar». */
  mode: 'create' | 'edit';
  pending: boolean;
  onSubmit: (payload: Payload, options: { submitForReview: boolean }) => void;
  onCancel: () => void;
};

const TEXTAREA_CLASS = 'w-full rounded border border-border bg-bg px-3 py-2 text-text';

/** G12.2 — Promo event form (no ticketing: no ticket types, price or capacity). */
export function GastroPromoEventForm({ initial, local, mode, pending, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<GastroPromoEventFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof GastroPromoEventFormState, string>>>({});
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof GastroPromoEventFormState>(key: K, value: GastroPromoEventFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (submitForReview: boolean) => {
    const result = buildGastroPromoEventPayload(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.data, { submitForReview });
  };

  const fieldError = (key: keyof GastroPromoEventFormState) =>
    errors[key] ? <p className="mt-1 text-xs text-red-400">{errors[key]}</p> : null;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-muted p-4">
      <p className="rounded border border-accent-muted bg-accent-surface/40 px-3 py-2 text-xs text-accent-soft">
        Evento publicitario: aparece en Eventos y en la ficha del local. No vende entradas ni tiene checkout.
      </p>
      <div>
        <Input label="Título del evento" value={form.title} onChange={(e) => set('title', e.target.value)} />
        {fieldError('title')}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="promo-event-description">
          Descripción
        </label>
        <textarea
          id="promo-event-description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className={TEXTAREA_CLASS}
        />
      </div>
      <GastroContentGalleryField
        title="Imágenes del evento"
        maxImages={GASTRO_PROMO_EVENT_GALLERY_MAX}
        uploaderLabel="Imágenes"
        uploaderHint="La primera imagen es la portada del evento; el resto se muestra en la galería de la ficha."
        value={form.galleryUrls}
        onChange={(urls) => set('galleryUrls', urls)}
        gastroProfileId={local.id}
        onUploadingChange={setUploading}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="promo-event-start">
            Fecha y hora de inicio
          </label>
          <input
            id="promo-event-start"
            type="datetime-local"
            value={form.startLocal}
            onChange={(e) => set('startLocal', e.target.value)}
            className={TEXTAREA_CLASS}
          />
          {fieldError('startLocal')}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="promo-event-end">
            Fin (opcional)
          </label>
          <input
            id="promo-event-end"
            type="datetime-local"
            value={form.endLocal}
            onChange={(e) => set('endLocal', e.target.value)}
            className={TEXTAREA_CLASS}
          />
          {fieldError('endLocal')}
        </div>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Ubicación</legend>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={form.atLocal} onChange={(e) => set('atLocal', e.target.checked)} />
          En el local ({local.displayName}
          {local.address ? ` · ${local.address}` : ''})
        </label>
        {!form.atLocal ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Input label="Lugar" value={form.venueName} onChange={(e) => set('venueName', e.target.value)} />
              {fieldError('venueName')}
            </div>
            <Input label="Dirección" value={form.venueAddress} onChange={(e) => set('venueAddress', e.target.value)} />
            <Input label="Ciudad" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
        ) : null}
      </fieldset>
      <div className="space-y-3">
        <SubcategorySelect category="event" value={form.subcategoryId} onChange={(id) => set('subcategoryId', id)} />
        <ContentTagSelector category="event" value={form.tagIds} onChange={(ids) => set('tagIds', ids)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {mode === 'create' ? (
          <>
            <Button onClick={() => submit(true)} disabled={pending || uploading}>
              Enviar a revisión
            </Button>
            <Button variant="outline" onClick={() => submit(false)} disabled={pending || uploading}>
              Guardar borrador
            </Button>
          </>
        ) : (
          <Button onClick={() => submit(false)} disabled={pending || uploading}>
            Guardar cambios
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
