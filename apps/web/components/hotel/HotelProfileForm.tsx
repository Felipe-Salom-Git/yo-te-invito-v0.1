'use client';

import { useEffect, useRef, useState } from 'react';
import type { HotelProfileUpdateInput } from '@yo-te-invito/shared';
import { Button, Input, SectionTitle } from '@/components';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import {
  EventLocationFields,
  validateLocationValue,
  type LocationValue,
} from '@/components/location';
import type { HotelProfile } from '@/repositories/interfaces';

type Props = {
  initial: HotelProfile;
  onSubmit: (payload: HotelProfileUpdateInput) => void;
  submitting?: boolean;
};

function locationFromProfile(profile: HotelProfile): LocationValue {
  return {
    address: profile.address ?? '',
    province: '',
    city: profile.city ?? '',
    lat: profile.geoLat,
    lng: profile.geoLng,
    placeId: null,
  };
}

function amenitiesToText(amenities: string[] | null | undefined): string {
  return (amenities ?? []).join('\n');
}

function textToAmenities(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function HotelProfileForm({ initial, onSubmit, submitting }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [description, setDescription] = useState(initial.description ?? '');
  const [starCategory, setStarCategory] = useState(
    initial.starCategory != null ? String(initial.starCategory) : '',
  );
  const [images, setImages] = useState({
    headerImageUrl: initial.bannerUrl ?? '',
    galleryImageUrls: initial.galleryUrls ?? [],
  });
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [location, setLocation] = useState<LocationValue>(locationFromProfile(initial));
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? '');
  const [whatsappPhone, setWhatsappPhone] = useState(initial.whatsappPhone ?? '');
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? '');
  const [bookingUrl, setBookingUrl] = useState(initial.bookingUrl ?? '');
  const [instagram, setInstagram] = useState(initial.socialLinks?.instagram ?? '');
  const [facebook, setFacebook] = useState(initial.socialLinks?.facebook ?? '');
  const [tripadvisor, setTripadvisor] = useState(initial.socialLinks?.tripadvisor ?? '');
  const [amenitiesText, setAmenitiesText] = useState(amenitiesToText(initial.amenities));
  const [locationError, setLocationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedId.current === initial.id) return;
    hydratedId.current = initial.id;
    setDisplayName(initial.displayName);
    setDescription(initial.description ?? '');
    setStarCategory(initial.starCategory != null ? String(initial.starCategory) : '');
    setImages({
      headerImageUrl: initial.bannerUrl ?? '',
      galleryImageUrls: initial.galleryUrls ?? [],
    });
    setLogoUrl(initial.logoUrl ?? '');
    setLocation(locationFromProfile(initial));
    setContactPhone(initial.contactPhone ?? '');
    setWhatsappPhone(initial.whatsappPhone ?? '');
    setContactEmail(initial.contactEmail ?? '');
    setWebsiteUrl(initial.websiteUrl ?? '');
    setBookingUrl(initial.bookingUrl ?? '');
    setInstagram(initial.socialLinks?.instagram ?? '');
    setFacebook(initial.socialLinks?.facebook ?? '');
    setTripadvisor(initial.socialLinks?.tripadvisor ?? '');
    setAmenitiesText(amenitiesToText(initial.amenities));
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!displayName.trim()) {
      setFormError('El nombre comercial es obligatorio.');
      return;
    }
    const locErr = validateLocationValue(location, {
      requireAddress: true,
      requireCity: true,
      requireCoords: true,
    });
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    setLocationError(null);

    const star =
      starCategory.trim() === '' ? null : parseInt(starCategory, 10);
    if (starCategory.trim() !== '' && (Number.isNaN(star) || star! < 1 || star! > 5)) {
      setFormError('Las estrellas deben ser un número entre 1 y 5.');
      return;
    }

    onSubmit({
      displayName: displayName.trim(),
      description: description.trim() || null,
      logoUrl: logoUrl.trim() || null,
      bannerUrl: images.headerImageUrl.trim() || null,
      galleryUrls: images.galleryImageUrls.filter(Boolean),
      location: {
        address: location.address.trim(),
        city: location.city.trim(),
        lat: location.lat!,
        lng: location.lng!,
      },
      starCategory: star,
      contactPhone: contactPhone.trim() || null,
      whatsappPhone: whatsappPhone.trim() || null,
      contactEmail: contactEmail.trim(),
      websiteUrl: websiteUrl.trim() || null,
      bookingUrl: bookingUrl.trim() || null,
      socialLinks: {
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        tripadvisor: tripadvisor.trim() || undefined,
      },
      amenities: textToAmenities(amenitiesText),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <section>
        <SectionTitle className="text-base">Identidad</SectionTitle>
        <div className="mt-4 space-y-4">
          <Input
            label="Nombre comercial"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-muted">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
              placeholder="Contá qué ofrece tu establecimiento…"
            />
          </div>
          <Input
            label="Categoría (estrellas)"
            type="number"
            min={1}
            max={5}
            value={starCategory}
            onChange={(e) => setStarCategory(e.target.value)}
          />
        </div>
      </section>

      <section>
        <SectionTitle className="text-base">Ubicación</SectionTitle>
        <div className="mt-4">
          <EventLocationFields
            value={location}
            onChange={setLocation}
            required
            mapError={locationError ?? undefined}
            addressError={locationError ?? undefined}
          />
        </div>
      </section>

      <section>
        <SectionTitle className="text-base">Contacto</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Teléfono"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <Input
            label="WhatsApp"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
          />
          <p className="text-xs text-text-muted sm:col-span-2">
            WhatsApp es solo para contacto; no activa reservas en la app.
          </p>
          <Input
            label="Email de contacto"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            label="Sitio web"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://…"
          />
          <Input
            label="Enlace de reservas externo"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="text-xs text-text-muted sm:col-span-2">
            Enlace externo opcional; no hay checkout en Yo Te Invito.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle className="text-base">Redes</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          <Input label="Facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          <Input
            label="TripAdvisor"
            value={tripadvisor}
            onChange={(e) => setTripadvisor(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section>
        <SectionTitle className="text-base">Imágenes</SectionTitle>
        <p className="mt-1 text-sm text-text-muted">Logo, portada y galería (URLs o subida desde el dispositivo).</p>
        <div className="mt-4 space-y-6">
          <Input
            label="Logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://… o subí desde galería abajo"
          />
          <RentalProductImagesForm value={images} onChange={setImages} />
        </div>
      </section>

      <section>
        <SectionTitle className="text-base">Servicios y comodidades</SectionTitle>
        <p className="mt-1 text-sm text-text-muted">Un servicio por línea (máx. 24).</p>
        <textarea
          value={amenitiesText}
          onChange={(e) => setAmenitiesText(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
          placeholder={'Wi‑Fi\nEstacionamiento\nDesayuno incluido'}
        />
      </section>

      {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : 'Guardar ficha'}
      </Button>
    </form>
  );
}
