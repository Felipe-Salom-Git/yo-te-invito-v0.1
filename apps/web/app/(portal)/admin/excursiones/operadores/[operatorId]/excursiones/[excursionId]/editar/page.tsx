'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { eventsKeys, excursionOperatorsKeys } from '@/lib/query/keys';
import {
  ExcursionSubcategoryMultiSelect,
  excursionSubcategoryIdsFromEvent,
  excursionSubcategoryIdsToPayload,
} from '@/components/excursions/ExcursionSubcategoryMultiSelect';
import {
  RentalProductImagesForm,
  rentalProductImagesFromEvent,
  rentalProductImagesToPayload,
  type RentalProductImagesValue,
} from '@/components/rentals/RentalProductImagesForm';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';
import {
  ExcursionScheduleFormFields,
  excursionScheduleFormValueFromEvent,
  excursionScheduleFormValueToPayload,
} from '@/components/excursions/ExcursionScheduleFormFields';
import {
  EventLocationFields,
  eventFieldsFromLocationValue,
  locationValueFromEventFields,
  validateOptionalEntityLocation,
  type LocationValue,
} from '@/components/location';
import { hasPublicLocationForMapLink } from '@/lib/maps';
import {
  ContentTagSelector,
  tagIdsFromEvent,
} from '@/components/content-tags/ContentTagSelector';

const TENANT_ID = 'tenant-demo';

const emptyImages: RentalProductImagesValue = {
  headerImageUrl: '',
  galleryImageUrls: [],
};

export default function AdminExcursionEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const operatorId = (params?.operatorId as string) ?? '';
  const excursionId = (params?.excursionId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: event, isLoading } = useQuery({
    queryKey: eventsKeys.detail(excursionId, TENANT_ID),
    queryFn: () => repos.events.getDetail(excursionId, TENANT_ID),
    enabled: !!excursionId,
  });

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [images, setImages] = useState<RentalProductImagesValue>(emptyImages);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [schedule, setSchedule] = useState(excursionScheduleFormValueFromEvent());
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setSummary(event.summary ?? '');
      setDescription(event.description ?? '');
      setSubcategoryIds(excursionSubcategoryIdsFromEvent(event));
      setTagIds(tagIdsFromEvent(event));
      setImages(rentalProductImagesFromEvent(event));
      setSchedule(excursionScheduleFormValueFromEvent(event.excursionSchedule));
      const loc = locationValueFromEventFields(event);
      const hasOwn = hasPublicLocationForMapLink({
        address: event.venueAddress,
        city: event.city,
        venueName: event.venueName,
        geoLat: event.geoLat,
        geoLng: event.geoLng,
      });
      setLocation(loc);
      setUseCustomLocation(hasOwn);
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (useCustomLocation && location) {
        const locErr = validateOptionalEntityLocation(location);
        if (locErr) {
          setLocationError(locErr);
          throw new Error(locErr);
        }
      }
      setLocationError(null);
      const loc = useCustomLocation && location ? eventFieldsFromLocationValue(location) : null;
      return repos.excursionOperators.updateExcursion(operatorId, excursionId, {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        ...excursionSubcategoryIdsToPayload(subcategoryIds),
        ...rentalProductImagesToPayload(images),
        ...excursionScheduleFormValueToPayload(schedule),
        tagIds,
        ...(loc ??
          (useCustomLocation
            ? {}
            : {
                venueAddress: null,
                city: null,
                province: null,
                googlePlaceId: null,
                geoLat: null,
                geoLng: null,
              })),
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(excursionId, TENANT_ID) });
      queryClient.invalidateQueries({ queryKey: excursionOperatorsKeys.all });
      router.push(`/admin/excursiones/operadores/${operatorId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateMutation.mutate();
  };

  if (isLoading || !location) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={`/admin/excursiones/operadores/${operatorId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Operador
      </Link>
      <SectionTitle>Editar excursión</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <Input label="Nombre / título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <RentalSummaryField value={summary} onChange={setSummary} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Detalle / descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
        <ExcursionSubcategoryMultiSelect value={subcategoryIds} onChange={setSubcategoryIds} />
        <ContentTagSelector category="excursion" value={tagIds} onChange={setTagIds} />
        <ExcursionScheduleFormFields value={schedule} onChange={setSchedule} />
        <div className="space-y-3 rounded-lg border border-border p-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={useCustomLocation}
              onChange={(e) => setUseCustomLocation(e.target.checked)}
              className="rounded border-border"
            />
            Ubicación propia de la excursión
          </label>
          <p className="text-xs text-text-muted">
            Si está desmarcado, el detalle público mostrará la ubicación del operador.
          </p>
          {useCustomLocation ? (
            <EventLocationFields
              value={location}
              onChange={setLocation}
              mapError={locationError ?? undefined}
            />
          ) : null}
        </div>
        <RentalProductImagesForm
          value={images}
          onChange={setImages}
          uploadConfig={{ scope: 'excursion', entityId: excursionId }}
          onUploadingChange={setImagesUploading}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={updateMutation.isPending || imagesUploading}>
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link href={`/admin/excursiones/operadores/${operatorId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
