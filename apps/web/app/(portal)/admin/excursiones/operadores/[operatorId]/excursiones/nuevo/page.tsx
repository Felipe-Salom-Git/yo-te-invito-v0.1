'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  ExcursionSubcategoryMultiSelect,
  excursionSubcategoryIdsToPayload,
} from '@/components/excursions/ExcursionSubcategoryMultiSelect';
import {
  RentalProductImagesForm,
  rentalProductImagesToPayload,
  type RentalProductImagesValue,
} from '@/components/rentals/RentalProductImagesForm';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';
import {
  ExcursionScheduleFormFields,
  emptyExcursionScheduleFormValue,
  excursionScheduleFormValueToPayload,
} from '@/components/excursions/ExcursionScheduleFormFields';
import {
  EventLocationFields,
  eventFieldsFromLocationValue,
  validateOptionalEntityLocation,
  type LocationValue,
} from '@/components/location';

const emptyImages: RentalProductImagesValue = {
  headerImageUrl: '',
  galleryImageUrls: [],
};

const emptyLocation: LocationValue = {
  address: '',
  city: '',
  province: '',
  placeId: '',
  lat: null,
  lng: null,
};

export default function AdminExcursionNuevoPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = (params?.operatorId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<RentalProductImagesValue>(emptyImages);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [schedule, setSchedule] = useState(emptyExcursionScheduleFormValue);
  const [location, setLocation] = useState<LocationValue>(emptyLocation);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (useCustomLocation) {
        const locErr = validateOptionalEntityLocation(location);
        if (locErr) {
          setLocationError(locErr);
          throw new Error(locErr);
        }
      }
      setLocationError(null);
      const loc = useCustomLocation ? eventFieldsFromLocationValue(location) : {};
      return repos.excursionOperators.createExcursion(operatorId, {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        ...excursionSubcategoryIdsToPayload(subcategoryIds),
        ...rentalProductImagesToPayload(images),
        ...excursionScheduleFormValueToPayload(schedule),
        ...(useCustomLocation ? loc : {}),
        status: 'approved',
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => router.push(`/admin/excursiones/operadores/${operatorId}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <PageContainer>
      <Link
        href={`/admin/excursiones/operadores/${operatorId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Operador
      </Link>
      <SectionTitle>Nueva excursión</SectionTitle>

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
        <ExcursionScheduleFormFields value={schedule} onChange={setSchedule} />
        <div className="space-y-3 rounded-lg border border-border p-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={useCustomLocation}
              onChange={(e) => setUseCustomLocation(e.target.checked)}
              className="rounded border-border"
            />
            Ubicación propia de la excursión (opcional)
          </label>
          <p className="text-xs text-text-muted">
            Si no marcás esta opción, el detalle público usará la ubicación del operador.
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
          uploadConfig={{ scope: 'excursion', entityId: operatorId }}
          onUploadingChange={setImagesUploading}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createMutation.isPending || imagesUploading}>
            {createMutation.isPending ? 'Creando…' : 'Crear excursión'}
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
