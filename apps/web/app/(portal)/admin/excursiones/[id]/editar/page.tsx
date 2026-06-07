'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import {
  ExcursionSubcategoryMultiSelect,
  excursionSubcategoryIdsFromEvent,
  excursionSubcategoryIdsToPayload,
} from '@/components/excursions/ExcursionSubcategoryMultiSelect';
import {
  EventLocationFields,
  eventFieldsFromLocationValue,
  locationValueFromEventFields,
  validateOptionalEntityLocation,
  type LocationValue,
} from '@/components/location';
import { IMAGE_ACCEPT_GCS } from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { ImageUploadHint } from '@/components/upload/ImageUploadHint';
import { isDataImageUrl } from '@/lib/upload/validate-public-image-file';
import {
  ExcursionScheduleFormFields,
  excursionScheduleFormValueFromEvent,
  excursionScheduleFormValueToPayload,
} from '@/components/excursions/ExcursionScheduleFormFields';

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
  const [venueName, setVenueName] = useState('');
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [startAt, setStartAt] = useState('');
  const [capacityTotal, setCapacityTotal] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(excursionScheduleFormValueFromEvent());

  const { isUploading, uploadProgress, uploadSingleWithProgress } = useGcsImageUpload(
    id ? { scope: 'excursion', entityId: id } : undefined,
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const url = await uploadSingleWithProgress(file, 'cover');
      if (url) setCoverImageUrl(url);
    },
    [uploadSingleWithProgress],
  );

  const handleCoverUrlChange = (url: string) => {
    if (isDataImageUrl(url)) {
      addToast(
        'Las imágenes embebidas (data-URL) no están permitidas. Subí un archivo o pegá una URL https.',
        'error',
      );
      return;
    }
    setCoverImageUrl(url);
  };

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setVenueName(event.venueName ?? '');
      setLocation(locationValueFromEventFields(event));
      setStartAt(event.startAt ? event.startAt.slice(0, 16) : '');
      setCapacityTotal(event.capacityTotal != null ? String(event.capacityTotal) : '');
      setCoverImageUrl(event.coverImageUrl ?? '');
      setSubcategoryIds(excursionSubcategoryIdsFromEvent(event));
      setSchedule(excursionScheduleFormValueFromEvent(event.excursionSchedule));
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
    if (location) {
      const locErr = validateOptionalEntityLocation(location);
      if (locErr) {
        setLocationError(locErr);
        return;
      }
    }
    setLocationError(null);
    const cover = coverImageUrl.trim();
    const loc = location ? eventFieldsFromLocationValue(location) : null;
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      city: loc?.city ?? null,
      venueName: venueName.trim() || null,
      venueAddress: loc?.venueAddress ?? null,
      province: loc?.province ?? null,
      googlePlaceId: loc?.googlePlaceId ?? null,
      geoLat: loc?.geoLat ?? null,
      geoLng: loc?.geoLng ?? null,
      startAt: startAt ? new Date(startAt).toISOString() : null,
      capacityTotal: capacityTotal ? parseInt(capacityTotal, 10) : null,
      coverImageUrl: cover || null,
      ...excursionSubcategoryIdsToPayload(subcategoryIds),
      ...excursionScheduleFormValueToPayload(schedule),
      ...(cover
        ? {
            media: [{ id: `img-${Date.now()}`, type: 'image' as const, url: cover, sortOrder: 0 }],
          }
        : {}),
    });
  };

  if (isLoading || !event || !location) {
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
          {uploadProgress ? (
            <p className="mb-2 text-sm text-accent" role="status">
              {uploadProgress}
            </p>
          ) : null}
          <ImageUploadHint variant="cover" options={{ gcs: true }} className="mb-2" />
          <Input
            label="URL de imagen"
            value={coverImageUrl}
            onChange={(e) => handleCoverUrlChange(e.target.value)}
            placeholder="https://…"
            disabled={isUploading}
          />
          <label className="mt-2 block text-sm text-text-muted">
            <span className="mr-2">O subir archivo:</span>
            <input
              type="file"
              accept={IMAGE_ACCEPT_GCS}
              onChange={handleFileChange}
              disabled={isUploading}
              className="text-sm disabled:opacity-50"
            />
          </label>
          <ImageUrlPreview url={coverImageUrl} />
        </div>
        <ExcursionScheduleFormFields value={schedule} onChange={setSchedule} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Ubicación (opcional)</label>
          <EventLocationFields value={location} onChange={setLocation} mapError={locationError ?? undefined} />
        </div>
        <ExcursionSubcategoryMultiSelect value={subcategoryIds} onChange={setSubcategoryIds} />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={updateMutation.isPending || isUploading}>
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
