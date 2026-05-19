'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';

const TENANT_ID = 'tenant-demo';

export default function AdminRentalLocalNuevoPage() {
  const router = useRouter();
  const repos = useRepositories();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      repos.rentalLocations.create({
        tenantId: TENANT_ID,
        name: name.trim(),
        address: address.trim() || null,
        openingHours,
        openingHoursNote: openingHoursNote.trim() || null,
        geoLat: geoLat ? Number(geoLat) : null,
        geoLng: geoLng ? Number(geoLng) : null,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (loc) => router.push(`/admin/rentals/locales/${loc.id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
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
        <Input
          label="Dirección"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, ciudad"
        />

        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          note={openingHoursNote}
          onNoteChange={setOpeningHoursNote}
        />

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-text">Ubicación en Maps</legend>
          <div>
            <Input
              label="Lat"
              type="number"
              step="any"
              value={geoLat}
              onChange={(e) => setGeoLat(e.target.value)}
              placeholder="-34.6037"
            />
            <Input
              label="Lng"
              type="number"
              step="any"
              value={geoLng}
              onChange={(e) => setGeoLng(e.target.value)}
              placeholder="-58.3816"
            />
          </div>
          <LatLngMapPreview lat={geoLat} lng={geoLng} />
        </fieldset>

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
