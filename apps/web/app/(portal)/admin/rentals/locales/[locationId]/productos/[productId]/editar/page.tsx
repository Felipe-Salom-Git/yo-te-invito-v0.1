'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import {
  RentalProductImagesForm,
  rentalProductImagesFromEvent,
  rentalProductImagesToPayload,
  type RentalProductImagesValue,
} from '@/components/rentals/RentalProductImagesForm';

const TENANT_ID = 'tenant-demo';

const emptyImages: RentalProductImagesValue = {
  headerImageUrl: '',
  galleryImageUrls: [],
};

export default function AdminRentalProductoEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationId = (params?.locationId as string) ?? '';
  const productId = (params?.productId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', 'detail', productId, TENANT_ID],
    queryFn: () => repos.events.getDetail(productId, TENANT_ID),
    enabled: !!productId,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [images, setImages] = useState<RentalProductImagesValue>(emptyImages);

  useEffect(() => {
    if (event) {
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setSubcategoryId(event.subcategoryId ?? '');
      setImages(rentalProductImagesFromEvent(event));
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: () =>
      repos.rentalLocations.updateProduct(locationId, productId, {
        title: title.trim(),
        description: description.trim() || null,
        subcategoryId: subcategoryId || null,
        ...rentalProductImagesToPayload(images),
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['rental-locations'] });
      router.push(`/admin/rentals/locales/${locationId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
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
      <SectionTitle>Editar producto</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <Input label="Nombre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
        <SubcategorySelect category="rental" value={subcategoryId} onChange={setSubcategoryId} />
        <RentalProductImagesForm value={images} onChange={setImages} />

        <div className="flex gap-3 pt-4">
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
