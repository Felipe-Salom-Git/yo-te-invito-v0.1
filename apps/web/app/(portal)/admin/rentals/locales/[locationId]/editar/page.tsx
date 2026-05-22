'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import {
  EMPTY_RENTAL_CONTACT,
  RentalLocationContactFields,
  rentalContactFromLocation,
  rentalContactPayload,
} from '@/components/rentals/RentalLocationContactFields';
import {
  RentalLocationFields,
  locationValueFromRentalLocation,
  rentalLocationPayloadFromLocationValue,
  validateLocationValue,
  type LocationValue,
} from '@/components/location';

export default function AdminRentalLocalEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationId = (params?.locationId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: location, isLoading } = useQuery({
    queryKey: ['rental-locations', 'admin', locationId],
    queryFn: () => repos.rentalLocations.getAdmin(locationId),
    enabled: !!locationId,
  });

  const [name, setName] = useState('');
  const [locationValue, setLocationValue] = useState<LocationValue>({
    address: '',
    province: '',
    city: '',
    lat: null,
    lng: null,
    placeId: null,
  });
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [contact, setContact] = useState(EMPTY_RENTAL_CONTACT);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (location && !hydrated) {
      setName(location.name);
      setLocationValue(locationValueFromRentalLocation(location));
      setOpeningHours(location.openingHours ?? createEmptyRentalOpeningHours());
      setOpeningHoursNote(location.openingHoursNote ?? '');
      setContact(rentalContactFromLocation(location));
      setHydrated(true);
    }
  }, [location, hydrated]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const geo = rentalLocationPayloadFromLocationValue(locationValue);
      return repos.rentalLocations.update(locationId, {
        name: name.trim(),
        address: geo.address,
        openingHours,
        openingHoursNote: openingHoursNote.trim() || null,
        ...rentalContactPayload(contact),
        geoLat: geo.geoLat,
        geoLng: geo.geoLng,
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-locations'] });
      router.push(`/admin/rentals/locales/${locationId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const locErr = validateLocationValue(locationValue);
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    setLocationError(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={`/admin/rentals/locales/${locationId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Local
      </Link>
      <SectionTitle>Editar local</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />

        <RentalLocationFields
          value={locationValue}
          onChange={setLocationValue}
          mapError={locationError ?? undefined}
        />

        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          note={openingHoursNote}
          onNoteChange={setOpeningHoursNote}
        />

        <RentalLocationContactFields value={contact} onChange={setContact} />

        <div>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link href={`/admin/rentals/locales/${locationId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
