'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { buildAdminEventDescription } from '@/lib/admin/event-description';
import { eventFieldsFromLocationValue } from '@/components/location';
import { rentalProductImagesToPayload } from '@/components/rentals/RentalProductImagesForm';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { ADMIN_GCS_TENANT_ENTITY_ID } from '@/lib/upload/admin-tenant-id';
import type { ContentCategory } from '@/repositories/interfaces';
import {
  EventCategoryPublicationFields,
  EMPTY_EVENT_PUBLICATION_VALUE,
} from './EventCategoryPublicationFields';
import {
  ServiceCategoryPublicationFields,
  EMPTY_SERVICE_PUBLICATION_VALUE,
} from './ServiceCategoryPublicationFields';

const CATEGORIES: ContentCategory[] = ['event', 'gastro', 'rental', 'excursion', 'hotel'];
const SERVICE_CATEGORIES = new Set<ContentCategory>(['rental', 'excursion']);

type GeneralPublicationCreateFormProps = {
  cancelHref?: string;
};

export function GeneralPublicationCreateForm({
  cancelHref = '/admin/publicaciones-generales',
}: GeneralPublicationCreateFormProps) {
  const router = useRouter();
  const repos = useRepositories();
  const { addToast } = useToast();
  const [category, setCategory] = useState<ContentCategory>('event');
  const [eventFields, setEventFields] = useState(EMPTY_EVENT_PUBLICATION_VALUE);
  const [serviceFields, setServiceFields] = useState(EMPTY_SERVICE_PUBLICATION_VALUE);
  const [imagesUploading, setImagesUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => {
      if (SERVICE_CATEGORIES.has(category)) {
        const imgPayload = rentalProductImagesToPayload(serviceFields.images);
        return repos.generalPublications.create({
          category,
          title: serviceFields.title.trim(),
          summary: serviceFields.summary.trim() || null,
          description: serviceFields.description.trim() || null,
          subcategoryId: serviceFields.subcategoryId || null,
          ...imgPayload,
          status: 'APPROVED',
        });
      }
      const loc = eventFieldsFromLocationValue(eventFields.location);
      return repos.generalPublications.create({
        category,
        title: eventFields.title.trim(),
        description: buildAdminEventDescription(
          eventFields.description,
          eventFields.valueOptional,
          eventFields.ofertas,
        ),
        city: loc.city,
        venueName: eventFields.venueName.trim() || null,
        venueAddress: loc.venueAddress,
        province: loc.province,
        googlePlaceId: loc.googlePlaceId,
        geoLat: loc.geoLat,
        geoLng: loc.geoLng,
        startAt: eventFields.startAt
          ? new Date(eventFields.startAt).toISOString()
          : new Date().toISOString(),
        endAt: eventFields.endAt ? new Date(eventFields.endAt).toISOString() : null,
        capacityTotal: eventFields.capacityTotal
          ? parseInt(eventFields.capacityTotal, 10)
          : null,
        subcategoryId: eventFields.subcategoryId || null,
        coverImageUrl: eventFields.coverImageUrl.trim() || null,
        status: 'APPROVED',
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => router.push(cancelHref),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = SERVICE_CATEGORIES.has(category)
      ? serviceFields.title.trim()
      : eventFields.title.trim();
    if (!title) return;
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Categoría</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ContentCategory)}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {getCategoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {category === 'event' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Las publicaciones de categoría Evento no incluyen ticketera ni venta de entradas.
        </p>
      )}

      {SERVICE_CATEGORIES.has(category) ? (
        <ServiceCategoryPublicationFields
          category={category as 'rental' | 'excursion'}
          value={serviceFields}
          onChange={setServiceFields}
          uploadConfig={
            category === 'excursion'
              ? { scope: 'excursion', entityId: ADMIN_GCS_TENANT_ENTITY_ID }
              : undefined
          }
          onUploadingChange={setImagesUploading}
        />
      ) : (
        <EventCategoryPublicationFields
          category={category}
          value={eventFields}
          onChange={setEventFields}
          showCapacity={category === 'event'}
          uploadConfig={
            category === 'event'
              ? { scope: 'event', entityId: ADMIN_GCS_TENANT_ENTITY_ID }
              : undefined
          }
          onUploadingChange={setImagesUploading}
        />
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={createMutation.isPending || imagesUploading}>
          {createMutation.isPending ? 'Creando…' : 'Crear publicación'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
