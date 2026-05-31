'use client';

import { useCallback, useEffect } from 'react';
import { Input, useToast } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { isDataImageUrl } from '@/lib/upload/validate-public-image-file';
import { SubcategorySelect } from '@/components/forms/SubcategorySelect';
import {
  EMPTY_LOCATION_VALUE,
  EventLocationFields,
  type LocationValue,
} from '@/components/location';
import type { ContentCategory } from '@/repositories/interfaces';

export type EventCategoryPublicationValue = {
  title: string;
  description: string;
  venueName: string;
  location: LocationValue;
  startAt: string;
  endAt: string;
  capacityTotal: string;
  valueOptional: string;
  ofertas: string;
  subcategoryId: string;
  coverImageUrl: string;
};

export const EMPTY_EVENT_PUBLICATION_VALUE: EventCategoryPublicationValue = {
  title: '',
  description: '',
  venueName: '',
  location: EMPTY_LOCATION_VALUE,
  startAt: '',
  endAt: '',
  capacityTotal: '',
  valueOptional: '',
  ofertas: '',
  subcategoryId: '',
  coverImageUrl: '',
};

type EventCategoryPublicationFieldsProps = {
  category: ContentCategory;
  value: EventCategoryPublicationValue;
  onChange: (value: EventCategoryPublicationValue) => void;
  showCapacity?: boolean;
  /** Admin event create: GCS cover upload (entityId = tenant until event exists). */
  uploadConfig?: GcsImageUploadConfig;
  onUploadingChange?: (uploading: boolean) => void;
};

export function EventCategoryPublicationFields({
  category,
  value,
  onChange,
  showCapacity,
  uploadConfig,
  onUploadingChange,
}: EventCategoryPublicationFieldsProps) {
  const { addToast } = useToast();
  const patch = (partial: Partial<EventCategoryPublicationValue>) =>
    onChange({ ...value, ...partial });

  const { gcsMode, isUploading, uploadProgress, uploadSingleWithProgress } =
    useGcsImageUpload(uploadConfig);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const rejectDataUrlIfGcs = (url: string): boolean => {
    if (gcsMode && isDataImageUrl(url)) {
      addToast(
        'Las imágenes embebidas (data-URL) no están permitidas. Subí un archivo o pegá una URL https.',
        'error',
      );
      return true;
    }
    return false;
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (gcsMode) {
        const url = await uploadSingleWithProgress(file, 'cover');
        if (url) patch({ coverImageUrl: url });
        return;
      }

      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => patch({ coverImageUrl: reader.result as string });
      reader.readAsDataURL(file);
    },
    [gcsMode, uploadSingleWithProgress, value, onChange],
  );

  return (
    <div className="space-y-4">
      {uploadProgress ? (
        <p className="text-sm text-accent" role="status">
          {uploadProgress}
        </p>
      ) : null}

      <Input
        label="Título"
        value={value.title}
        onChange={(e) => patch({ title: e.target.value })}
        required
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
        <textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={3}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
        />
      </div>
      <Input
        label="Lugar"
        value={value.venueName}
        onChange={(e) => patch({ venueName: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Fecha inicio (opcional)"
          type="datetime-local"
          value={value.startAt}
          onChange={(e) => patch({ startAt: e.target.value })}
        />
        <Input
          label="Fecha fin (opcional)"
          type="datetime-local"
          value={value.endAt}
          onChange={(e) => patch({ endAt: e.target.value })}
        />
      </div>
      {showCapacity && (
        <Input
          label="Capacidad (opcional)"
          type="number"
          value={value.capacityTotal}
          onChange={(e) => patch({ capacityTotal: e.target.value })}
        />
      )}
      <Input
        label="Valor referencial (opcional)"
        value={value.valueOptional}
        onChange={(e) => patch({ valueOptional: e.target.value })}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Imagen</label>
        {gcsMode ? (
          <p className="mb-2 text-xs text-text-muted">
            Cover vía Google Cloud Storage (JPEG, PNG o WEBP, máx. 5 MB).
          </p>
        ) : null}
        <Input
          label="URL de imagen"
          value={value.coverImageUrl}
          onChange={(e) => {
            const url = e.target.value;
            if (rejectDataUrlIfGcs(url)) return;
            patch({ coverImageUrl: url });
          }}
          disabled={isUploading}
        />
        <label className="mt-2 block text-sm text-text-muted">
          <span className="mr-2">O subir archivo:</span>
          <input
            type="file"
            accept={gcsMode ? IMAGE_ACCEPT_GCS : 'image/*'}
            onChange={handleFileChange}
            disabled={isUploading}
            className="text-sm disabled:opacity-50"
          />
        </label>
        <ImageUrlPreview url={value.coverImageUrl} />
      </div>
      <Input
        label="Ofertas / promoción (opcional)"
        value={value.ofertas}
        onChange={(e) => patch({ ofertas: e.target.value })}
      />
      <EventLocationFields value={value.location} onChange={(location) => patch({ location })} />
      <SubcategorySelect
        category={category === 'hotel' ? 'event' : category}
        value={value.subcategoryId}
        onChange={(subcategoryId) => patch({ subcategoryId })}
      />
    </div>
  );
}
