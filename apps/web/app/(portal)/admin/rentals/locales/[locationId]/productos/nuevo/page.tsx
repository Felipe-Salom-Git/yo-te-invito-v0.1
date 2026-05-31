'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import {
  RentalProductImagesForm,
  rentalProductImagesToPayload,
  type RentalProductImagesValue,
} from '@/components/rentals/RentalProductImagesForm';
import { RentalSummaryField } from '@/components/rentals/RentalSummaryField';

const emptyImages: RentalProductImagesValue = {
  headerImageUrl: '',
  galleryImageUrls: [],
};

export default function AdminRentalProductoNuevoPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = (params?.locationId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [images, setImages] = useState<RentalProductImagesValue>(emptyImages);
  const [imagesUploading, setImagesUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      repos.rentalLocations.createProduct(locationId, {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        subcategoryId: subcategoryId || null,
        ...rentalProductImagesToPayload(images),
        status: 'approved',
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => router.push(`/admin/rentals/locales/${locationId}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <PageContainer>
      <Link
        href={`/admin/rentals/locales/${locationId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Local
      </Link>
      <SectionTitle>Nuevo producto</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Ítem o servicio de alquiler (equipos, vehículos, etc.) en este local.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <Input label="Nombre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <RentalSummaryField value={summary} onChange={setSummary} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Descripción / Detalle</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
        <SubcategorySelect category="rental" value={subcategoryId} onChange={setSubcategoryId} />
        <RentalProductImagesForm
          value={images}
          onChange={setImages}
          uploadConfig={{ mode: 'gcs-rental', rentalLocationId: locationId }}
          onUploadingChange={setImagesUploading}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createMutation.isPending || imagesUploading}>
            {createMutation.isPending ? 'Creando…' : 'Crear producto'}
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
