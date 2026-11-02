'use client';

import { GASTRO_CONTENT_GALLERY_MAX } from '@yo-te-invito/shared';
import {
  RentalProductImagesForm,
  type GcsImageUploadConfig,
} from '@/components/rentals/RentalProductImagesForm';

export type GastroContentGalleryFieldProps = {
  value: string[];
  onChange: (galleryUrls: string[]) => void;
  /** GastroProfile.id — required for GCS uploads scoped to the local. */
  gastroProfileId?: string;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Copy / limit overrides (e.g. promo events); defaults = GastroContent post. */
  title?: string;
  maxImages?: number;
  uploaderLabel?: string;
  uploaderHint?: string;
};

/**
 * Gallery editor for a GastroContent post.
 * Reuses rental/local SortableImageList + GCS upload; does not delete remote assets on remove.
 */
export function GastroContentGalleryField({
  value,
  onChange,
  gastroProfileId,
  onUploadingChange,
  disabled = false,
  className = '',
  title = 'Galería de la publicación',
  maxImages = GASTRO_CONTENT_GALLERY_MAX,
  uploaderLabel,
  uploaderHint,
}: GastroContentGalleryFieldProps) {
  const uploadConfig: GcsImageUploadConfig | undefined = gastroProfileId
    ? { scope: 'gastro', entityId: gastroProfileId }
    : undefined;

  return (
    <div className={className.trim() || undefined}>
      <p className="mb-2 text-sm font-medium text-text-muted">{title}</p>
      <p className="mb-3 text-xs text-text-muted">
        Hasta {maxImages} imágenes. La primera es la portada. Quitar una imagen no
        borra el archivo del storage.
      </p>
      <fieldset disabled={disabled} className="min-w-0">
        <RentalProductImagesForm
          galleryOnly
          uploadConfig={uploadConfig}
          onUploadingChange={onUploadingChange}
          galleryLabel={uploaderLabel}
          galleryUsageHint={uploaderHint}
          value={{
            headerImageUrl: value[0] ?? '',
            galleryImageUrls: value.slice(0, maxImages),
          }}
          onChange={(next) => {
            const urls = next.galleryImageUrls
              .map((u) => u.trim())
              .filter(Boolean)
              .slice(0, maxImages);
            onChange(urls);
          }}
        />
      </fieldset>
    </div>
  );
}
