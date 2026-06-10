'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createEmptyGastroWeeklyOpeningHours,
  createEmptyRentalOpeningHours,
  type GastroOpeningHoursMode,
} from '@yo-te-invito/shared';
import { Button, Input, SectionTitle } from '@/components';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import { WeeklyOpeningHoursEditor } from '@/components/forms/WeeklyOpeningHoursEditor';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import {
  EventLocationFields,
  gastroLocationPayloadFromLocationValue,
  validateGastroLocationValue,
  type LocationValue,
} from '@/components/location';
import {
  ExternalLinksFormFields,
  externalLinksFromGastroLocal,
  externalLinksToPayload,
  type ExternalLinksFormValue,
} from '@/components/forms/ExternalLinksFormFields';
import {
  RelatedLinksFormFields,
  normalizeRelatedLinksForSave,
  validateRelatedLinksDraft,
} from '@/components/forms/RelatedLinksFormFields';
import type { RelatedLinkItem } from '@yo-te-invito/shared';
import {
  ContentTagSelector,
  tagIdsFromEvent,
} from '@/components/content-tags/ContentTagSelector';
import type { GastroLocal, GastroLocalUpsertPayload } from '@/repositories/interfaces';

export type GastroLocalFormMode = 'owner' | 'admin';

type Props = {
  initial?: GastroLocal | null;
  subcategories: Array<{ id: string; name: string }>;
  onSubmit: (payload: GastroLocalUpsertPayload) => void;
  submitting?: boolean;
  submitLabel: string;
  /** GastroProfile.id — required for GCS file uploads. */
  gastroProfileId?: string;
  mode?: GastroLocalFormMode;
  /** Admin create/edit — razón social. */
  legalName?: string;
  onLegalNameChange?: (value: string) => void;
  /** When false, subcategory is optional even if options exist (admin). */
  requireSubcategory?: boolean;
  imagesHelperText?: string;
};

function locationFromLocal(local: GastroLocal): LocationValue {
  return {
    address: local.address ?? '',
    province: local.province ?? '',
    city: local.city ?? '',
    lat: local.geoLat,
    lng: local.geoLng,
    placeId: local.googlePlaceId ?? null,
  };
}

export function GastroLocalForm({
  initial,
  subcategories,
  onSubmit,
  submitting,
  submitLabel,
  gastroProfileId,
  mode = 'owner',
  legalName: legalNameProp,
  onLegalNameChange,
  requireSubcategory,
  imagesHelperText,
}: Props) {
  const isAdmin = mode === 'admin';
  const mustPickSubcategory =
    requireSubcategory ?? (!isAdmin && subcategories.length > 0);
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? '');
  const [tagIds, setTagIds] = useState<string[]>(() =>
    initial ? tagIdsFromEvent(initial) : [],
  );
  const [images, setImages] = useState({
    headerImageUrl: initial?.bannerUrl ?? '',
    galleryImageUrls: initial?.galleryUrls ?? [],
  });
  const [location, setLocation] = useState<LocationValue>(
    initial
      ? locationFromLocal(initial)
      : {
          address: '',
          province: '',
          city: '',
          lat: null,
          lng: null,
          placeId: null,
        },
  );
  const [openingHoursMode, setOpeningHoursMode] = useState<GastroOpeningHoursMode>(
    initial?.openingHoursMode ?? 'simple',
  );
  const [openingHours, setOpeningHours] = useState(
    initial?.openingHours ?? createEmptyRentalOpeningHours(),
  );
  const [openingHoursWeekly, setOpeningHoursWeekly] = useState(
    initial?.openingHoursWeekly ?? createEmptyGastroWeeklyOpeningHours(),
  );
  const [openingHoursNote, setOpeningHoursNote] = useState(initial?.openingHoursNote ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [externalLinks, setExternalLinks] = useState<ExternalLinksFormValue>(() =>
    initial ? externalLinksFromGastroLocal(initial) : externalLinksFromGastroLocal({}),
  );
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkItem[]>(
    initial?.relatedLinks ?? [],
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const hydratedFromId = useRef<string | null>(null);

  const uploadConfig: GcsImageUploadConfig | undefined = gastroProfileId
    ? { scope: 'gastro', entityId: gastroProfileId }
    : undefined;

  useEffect(() => {
    if (!initial?.id) return;
    if (hydratedFromId.current === initial.id) return;
    hydratedFromId.current = initial.id;
    setDisplayName(initial.displayName);
    setSummary(initial.summary ?? '');
    setDetail(initial.detail ?? '');
    setSubcategoryId(initial.subcategoryId ?? '');
    setTagIds(tagIdsFromEvent(initial));
    setImages({
      headerImageUrl: initial.bannerUrl ?? '',
      galleryImageUrls: initial.galleryUrls ?? [],
    });
    setLocation(locationFromLocal(initial));
    setOpeningHoursMode(initial.openingHoursMode ?? 'simple');
    setOpeningHours(initial.openingHours ?? createEmptyRentalOpeningHours());
    setOpeningHoursWeekly(initial.openingHoursWeekly ?? createEmptyGastroWeeklyOpeningHours());
    setOpeningHoursNote(initial.openingHoursNote ?? '');
    setContactPhone(initial.contactPhone ?? '');
    setContactEmail(initial.contactEmail ?? '');
    setExternalLinks(externalLinksFromGastroLocal(initial));
    setRelatedLinks(initial.relatedLinks ?? []);
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !contactEmail.trim()) return;
    const locErr = validateGastroLocationValue(location);
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    if (mustPickSubcategory && !subcategoryId) {
      setLocationError('Seleccioná una subcategoría gastronómica.');
      return;
    }
    const linksError = validateRelatedLinksDraft(relatedLinks);
    if (linksError) {
      setLocationError(linksError);
      return;
    }
    setLocationError(null);
    const links = externalLinksToPayload(externalLinks);
    onSubmit({
      displayName: displayName.trim(),
      summary: summary.trim() || null,
      detail: detail.trim() || null,
      subcategoryId: subcategoryId || null,
      tagIds,
      bannerUrl: images.headerImageUrl.trim() || null,
      galleryUrls: images.galleryImageUrls.filter(Boolean),
      location: gastroLocationPayloadFromLocationValue(location),
      openingHours,
      openingHoursMode,
      openingHoursWeekly: openingHoursMode === 'weekly' ? openingHoursWeekly : null,
      openingHoursNote: openingHoursNote.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim(),
      menuUrl: links.menuUrl,
      websiteUrl: links.websiteUrl,
      bookingUrl: links.bookingUrl,
      socialLinks: links.socialLinks,
      relatedLinks: normalizeRelatedLinksForSave(relatedLinks),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionTitle>{isAdmin ? 'Identidad' : 'Datos del local'}</SectionTitle>
      {isAdmin && onLegalNameChange != null && (
        <Input
          label="Razón social / nombre legal (opcional)"
          value={legalNameProp ?? ''}
          onChange={(e) => onLegalNameChange(e.target.value)}
        />
      )}
      <Input
        label="Nombre comercial"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
      />
      <RentalSummaryField value={summary} onChange={setSummary} />
      <div>
        <label className="mb-1 block text-sm text-text-muted">Detalle</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={5}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
      {subcategories.length > 0 ? (
        <div>
          <label className="mb-1 block text-sm text-text-muted">Subcategoría gastronómica</label>
          <select
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            required={mustPickSubcategory}
          >
            <option value="">Seleccionar…</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : isAdmin ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-muted">
          No hay subcategorías gastro activas. Configuralas en{' '}
          <span className="text-accent">/admin/categorias</span> antes de asignar una.
        </p>
      ) : null}
      <ContentTagSelector category="gastro" value={tagIds} onChange={setTagIds} />
      <div>
        {isAdmin ? <p className="mb-2 text-sm font-medium text-text">Imágenes</p> : null}
        {imagesHelperText ? (
          <p className="mb-2 text-xs text-text-muted">{imagesHelperText}</p>
        ) : null}
        <RentalProductImagesForm
          value={images}
          onChange={setImages}
          uploadConfig={uploadConfig}
          onUploadingChange={setIsUploadingImages}
        />
      </div>
      {isAdmin ? <p className="text-sm font-medium text-text">Ubicación</p> : null}
      <EventLocationFields
        value={location}
        onChange={setLocation}
        required
        provinceError={locationError ?? undefined}
      />
      {isAdmin ? <p className="text-sm font-medium text-text">Horarios y contacto</p> : null}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Horario de atención</legend>
        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="openingHoursMode"
              checked={openingHoursMode === 'simple'}
              onChange={() => setOpeningHoursMode('simple')}
              className="border-border"
            />
            Usar horario simple
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="openingHoursMode"
              checked={openingHoursMode === 'weekly'}
              onChange={() => setOpeningHoursMode('weekly')}
              className="border-border"
            />
            Configurar por día
          </label>
        </div>
        {openingHoursMode === 'simple' ? (
          <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        ) : (
          <WeeklyOpeningHoursEditor value={openingHoursWeekly} onChange={setOpeningHoursWeekly} />
        )}
      </fieldset>
      <Input
        label="Nota horarios (opcional)"
        value={openingHoursNote}
        onChange={(e) => setOpeningHoursNote(e.target.value)}
      />
      <Input
        label={isAdmin ? 'Teléfono / WhatsApp' : 'Teléfono'}
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
      />
      <Input
        label="Email de contacto"
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        required
      />
      <ExternalLinksFormFields
        value={externalLinks}
        onChange={setExternalLinks}
        showMenuUrl
        sectionTitle={isAdmin ? 'Enlaces y redes' : 'Reservas y redes'}
      />
      <RelatedLinksFormFields value={relatedLinks} onChange={setRelatedLinks} />
      {locationError && <p className="text-sm text-red-500">{locationError}</p>}
      <Button type="submit" disabled={submitting || isUploadingImages}>
        {submitLabel}
      </Button>
    </form>
  );
}