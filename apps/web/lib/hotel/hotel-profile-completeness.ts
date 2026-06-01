import type { HotelProfile } from '@/repositories/interfaces';

export type HotelProfileBlockId = 'identity' | 'location' | 'contact' | 'images' | 'amenities';

export type HotelCompletenessItem = {
  id: string;
  block: HotelProfileBlockId;
  label: string;
  done: boolean;
  editHref: string;
};

export type HotelProfileCompleteness = {
  items: HotelCompletenessItem[];
  percent: number;
  doneCount: number;
  totalRequired: number;
};

const EDIT = '/hotel/editar';

export function getHotelProfileCompleteness(profile: HotelProfile): HotelProfileCompleteness {
  const hasName = Boolean(profile.displayName?.trim());
  const hasDescription = Boolean(profile.description?.trim());
  const hasLocation = Boolean(profile.address?.trim() && profile.city?.trim());
  const hasContact = Boolean(
    profile.contactPhone?.trim() ||
      profile.whatsappPhone?.trim() ||
      profile.contactEmail?.trim(),
  );
  const hasImages = Boolean(
    profile.logoUrl?.trim() || profile.bannerUrl?.trim() || (profile.galleryUrls?.length ?? 0) > 0,
  );
  const hasAmenities = (profile.amenities?.length ?? 0) > 0;

  const items: HotelCompletenessItem[] = [
    { id: 'name', block: 'identity', label: 'Nombre comercial', done: hasName, editHref: EDIT },
    {
      id: 'desc',
      block: 'identity',
      label: 'Descripción',
      done: hasDescription,
      editHref: EDIT,
    },
    { id: 'loc', block: 'location', label: 'Dirección y mapa', done: hasLocation, editHref: EDIT },
    { id: 'contact', block: 'contact', label: 'Teléfono o email', done: hasContact, editHref: EDIT },
    { id: 'images', block: 'images', label: 'Logo o imágenes', done: hasImages, editHref: EDIT },
    {
      id: 'amenities',
      block: 'amenities',
      label: 'Servicios o comodidades',
      done: hasAmenities,
      editHref: EDIT,
    },
  ];

  const totalRequired = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const percent = totalRequired === 0 ? 0 : Math.round((doneCount / totalRequired) * 100);

  return { items, percent, doneCount, totalRequired };
}

export function hotelProfileStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'PENDING':
      return 'Pendiente de revisión';
    case 'DRAFT':
      return 'Borrador';
    case 'REJECTED':
      return 'Rechazado';
    case 'SUSPENDED':
      return 'Suspendido';
    default:
      return status;
  }
}
