'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import {
  EMPTY_RENTAL_CONTACT,
  RentalLocationContactFields,
  rentalContactPayload,
} from '@/components/rentals/RentalLocationContactFields';
import {
  EMPTY_LOCATION_VALUE,
  RentalLocationFields,
  rentalLocationPayloadFromLocationValue,
  validateLocationValue,
  type LocationValue,
} from '@/components/location';

const TENANT_ID = 'tenant-demo';

export default function AdminRentalLocalNuevoPage() {
  const router = useRouter();
  const repos = useRepositories();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [contact, setContact] = useState(EMPTY_RENTAL_CONTACT);
  const [locationError, setLocationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const geo = rentalLocationPayloadFromLocationValue(location);
      return repos.rentalLocations.create({
        tenantId: TENANT_ID,
        name: name.trim(),
        openingHours,
        openingHoursNote: openingHoursNote.trim() || null,
        ...rentalContactPayload(contact),
        ...geo,
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (loc) => router.push(`/admin/rentals/locales/${loc.id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const locErr = validateLocationValue(location, { requireAddress: false });
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    setLocationError(null);
    createMutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/admin/rentals" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Rentals
      </Link>
      <SectionTitle>Crear local</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Punto de alquiler (autos, bicis, equipos, etc.). No es alojamiento.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />

        <RentalLocationFields
          value={location}
          onChange={setLocation}
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando…' : 'Crear local'}
          </Button>
          <Link href="/admin/rentals">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
