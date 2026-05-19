'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';

const TENANT_ID = 'tenant-demo';

export default function AdminExcursionEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => repos.events.getDetail(id, TENANT_ID),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [capacityTotal, setCapacityTotal] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setCity(event.city ?? '');
      setVenueName(event.venueName ?? '');
      setStartAt(event.startAt ? event.startAt.slice(0, 16) : '');
      setCapacityTotal(event.capacityTotal != null ? String(event.capacityTotal) : '');
      setCoverImageUrl(event.coverImageUrl ?? '');
      setVenueAddress(event.venueAddress ?? '');
      setGeoLat(event.geoLat != null ? String(event.geoLat) : '');
      setGeoLng(event.geoLng != null ? String(event.geoLng) : '');
      setSubcategoryId(event.subcategoryId ?? '');
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => repos.events.update(id, patch),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.push('/admin/excursiones');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const cover = coverImageUrl.trim();
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      city: city.trim() || null,
      venueName: venueName.trim() || null,
      venueAddress: venueAddress.trim() || null,
      geoLat: geoLat ? Number(geoLat) : null,
      geoLng: geoLng ? Number(geoLng) : null,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      capacityTotal: capacityTotal ? parseInt(capacityTotal, 10) : null,
      coverImageUrl: cover || null,
      subcategoryId: subcategoryId || null,
      ...(cover
        ? {
            media: [{ id: `img-${Date.now()}`, type: 'image' as const, url: cover, sortOrder: 0 }],
          }
        : {}),
    });
  };

  if (isLoading || !event) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/admin/excursiones" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Excursiones
      </Link>
      <SectionTitle>Editar excursión</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
        <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="Lugar" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        <Input
          label="Fecha inicio (opcional)"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <Input
          label="Capacidad (opcional)"
          type="number"
          value={capacityTotal}
          onChange={(e) => setCapacityTotal(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Imagen</label>
          <Input
            label="URL de imagen"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://…"
          />
          <label className="mt-2 block text-sm text-text-muted">
            <span className="mr-2">O subir archivo:</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
          </label>
          <ImageUrlPreview url={coverImageUrl} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Ubicación (opcional)</label>
          <Input
            label="Dirección"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="Calle, ciudad"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input label="Lat" type="number" step="any" value={geoLat} onChange={(e) => setGeoLat(e.target.value)} />
            <Input label="Lng" type="number" step="any" value={geoLng} onChange={(e) => setGeoLng(e.target.value)} />
          </div>
          <LatLngMapPreview lat={geoLat} lng={geoLng} />
        </div>
        <SubcategorySelect
          category="excursion"
          value={subcategoryId}
          onChange={setSubcategoryId}
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link href="/admin/excursiones">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
