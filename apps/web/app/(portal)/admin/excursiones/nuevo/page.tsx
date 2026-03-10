'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function AdminExcursionNuevoPage() {
  const router = useRouter();
  const repos = useRepositories();
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [capacityTotal, setCapacityTotal] = useState('');
  const [valueOptional, setValueOptional] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [ofertas, setOfertas] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const createMutation = useMutation({
    mutationFn: () =>
      repos.events.create({
        tenantId: TENANT_ID,
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        venueName: venueName.trim() || null,
        venueAddress: venueAddress.trim() || null,
        geoLat: geoLat ? Number(geoLat) : null,
        geoLng: geoLng ? Number(geoLng) : null,
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
        endAt: null,
        category: 'excursion',
        capacityTotal: capacityTotal ? parseInt(capacityTotal, 10) : null,
        coverImageUrl: coverImageUrl.trim() || null,
        isTicketingEnabled: true,
        status: 'approved',
        media: coverImageUrl ? [{ id: `img-${Date.now()}`, type: 'image', url: coverImageUrl, sortOrder: 0 }] : [],
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => router.push('/admin/excursiones'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/admin/excursiones" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Excursiones
      </Link>
      <SectionTitle>Crear excursión</SectionTitle>

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
          placeholder="Ej. 25"
        />
        <Input
          label="Valor (opcional)"
          type="number"
          value={valueOptional}
          onChange={(e) => setValueOptional(e.target.value)}
          placeholder="Precio base"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Imagen</label>
          <div className="space-y-2">
            <Input
              label="URL de imagen"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://…"
            />
            <label className="block text-sm text-text-muted">
              <span className="mr-2">O subir archivo:</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
            </label>
          </div>
        </div>
        <Input
          label="Ofertas / promoción (opcional)"
          value={ofertas}
          onChange={(e) => setOfertas(e.target.value)}
          placeholder="Texto de oferta"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Ubicación (opcional)</label>
          <Input
            label="Dirección"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="Calle, número, ciudad"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
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
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando…' : 'Crear'}
          </Button>
          <Link href="/admin/excursiones">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
