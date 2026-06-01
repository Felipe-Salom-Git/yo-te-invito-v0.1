'use client';

import { useEffect, useRef, useState } from 'react';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { Button, Input, SectionTitle } from '@/components';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import {
  EventLocationFields,
  gastroLocationPayloadFromLocationValue,
  validateGastroLocationValue,
  type LocationValue,
} from '@/components/location';
import type { GastroLocal, GastroLocalUpsertPayload } from '@/repositories/interfaces';

type Props = {
  initial?: GastroLocal | null;
  subcategories: Array<{ id: string; name: string }>;
  onSubmit: (payload: GastroLocalUpsertPayload) => void;
  submitting?: boolean;
  submitLabel: string;
  /** GastroProfile.id — required for GCS uploads. */
  gastroProfileId?: string;
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
}: Props) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? '');
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
  const [openingHours, setOpeningHours] = useState(
    initial?.openingHours ?? createEmptyRentalOpeningHours(),
  );
  const [openingHoursNote, setOpeningHoursNote] = useState(initial?.openingHoursNote ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [menuUrl, setMenuUrl] = useState(initial?.menuUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '');
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
    setImages({
      headerImageUrl: initial.bannerUrl ?? '',
      galleryImageUrls: initial.galleryUrls ?? [],
    });
    setLocation(locationFromLocal(initial));
    setOpeningHours(initial.openingHours ?? createEmptyRentalOpeningHours());
    setOpeningHoursNote(initial.openingHoursNote ?? '');
    setContactPhone(initial.contactPhone ?? '');
    setContactEmail(initial.contactEmail ?? '');
    setMenuUrl(initial.menuUrl ?? '');
    setWebsiteUrl(initial.websiteUrl ?? '');
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !contactEmail.trim()) return;
    const locErr = validateGastroLocationValue(location);
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    if (subcategories.length > 0 && !subcategoryId) {
      setLocationError('Seleccioná una subcategoría.');
      return;
    }
    setLocationError(null);
    onSubmit({
      displayName: displayName.trim(),
      summary: summary.trim() || null,
      detail: detail.trim() || null,
      subcategoryId: subcategoryId || null,
      bannerUrl: images.headerImageUrl.trim() || null,
      galleryUrls: images.galleryImageUrls.filter(Boolean),
      location: gastroLocationPayloadFromLocationValue(location),
      openingHours,
      openingHoursNote: openingHoursNote.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim(),
      menuUrl: menuUrl.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionTitle>Datos del local</SectionTitle>
      <Input label="Nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      <div>
        <label className="mb-1 block text-sm text-text-muted">Resumen (máx. 220 caracteres)</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={2}
          maxLength={220}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Detalle</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={5}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
      {subcategories.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-text-muted">Subcategoría</label>
          <select
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <RentalProductImagesForm
        value={images}
        onChange={setImages}
        uploadConfig={uploadConfig}
        onUploadingChange={setIsUploadingImages}
      />
      <EventLocationFields
        value={location}
        onChange={setLocation}
        required
        provinceError={locationError ?? undefined}
      />
      <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
      <Input
        label="Nota horarios (opcional)"
        value={openingHoursNote}
        onChange={(e) => setOpeningHoursNote(e.target.value)}
      />
      <Input label="Teléfono" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      <Input
        label="Email de contacto"
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        required
      />
      <Input label="Menú digital (URL)" value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} />
      <Input label="Página web (URL)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      {locationError && <p className="text-sm text-red-500">{locationError}</p>}
      <Button type="submit" disabled={submitting || isUploadingImages}>
        {submitLabel}
      </Button>
    </form>
  );
}