'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';

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
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');

  useEffect(() => {
    if (location) {
      setName(location.name);
      setAddress(location.address ?? '');
      setOpeningHours(location.openingHours ?? createEmptyRentalOpeningHours());
      setOpeningHoursNote(location.openingHoursNote ?? '');
      setGeoLat(location.geoLat != null ? String(location.geoLat) : '');
      setGeoLng(location.geoLng != null ? String(location.geoLng) : '');
    }
  }, [location]);

  const updateMutation = useMutation({
    mutationFn: () =>
      repos.rentalLocations.update(locationId, {
        name: name.trim(),
        address: address.trim() || null,
        openingHours,
        openingHoursNote: openingHoursNote.trim() || null,
        geoLat: geoLat ? Number(geoLat) : null,
        geoLng: geoLng ? Number(geoLng) : null,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-locations'] });
      router.push(`/admin/rentals/locales/${locationId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
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
        <Input label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />

        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          note={openingHoursNote}
          onNoteChange={setOpeningHoursNote}
        />

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-text">Ubicación en Maps</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Lat" type="number" step="any" value={geoLat} onChange={(e) => setGeoLat(e.target.value)} />
            <Input label="Lng" type="number" step="any" value={geoLng} onChange={(e) => setGeoLng(e.target.value)} />
          </div>
          <LatLngMapPreview lat={geoLat} lng={geoLng} />
        </fieldset>

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
