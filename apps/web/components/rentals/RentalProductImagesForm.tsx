'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, useToast } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { compressImageFileToDataUrl, compressImageFilesToDataUrls } from '@/lib/image-compress';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { ImageUploadHint } from '@/components/upload/ImageUploadHint';
import { isDataImageUrl } from '@/lib/upload/validate-public-image-file';

export type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';

export type RentalProductImagesValue = {
  headerImageUrl: string;
  galleryImageUrls: string[];
};

export type RentalProductImagesFormProps = {
  value: RentalProductImagesValue;
  onChange: (value: RentalProductImagesValue) => void;
  /** When true, only the multi-image gallery is shown (no separate header field). */
  galleryOnly?: boolean;
  /** When set, file uploads go to GCS — no new data-URLs. */
  uploadConfig?: GcsImageUploadConfig;
  /** Notifies parent while GCS uploads are in progress (disable save). */
  onUploadingChange?: (uploading: boolean) => void;
};

const IMAGE_ACCEPT_LEGACY = 'image/*';

export function RentalProductImagesForm({
  value,
  onChange,
  galleryOnly = false,
  uploadConfig,
  onUploadingChange,
}: RentalProductImagesFormProps) {
  const { addToast } = useToast();
  const [galleryUrlDraft, setGalleryUrlDraft] = useState('');
  const {
    gcsMode,
    isUploading,
    uploadProgress,
    uploadSingleWithProgress,
    uploadFilesSequential,
  } = useGcsImageUpload(uploadConfig);

  const fileAccept = gcsMode ? IMAGE_ACCEPT_GCS : IMAGE_ACCEPT_LEGACY;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const setHeader = (headerImageUrl: string) => onChange({ ...value, headerImageUrl });

  const removeGalleryAt = (index: number) =>
    onChange({
      ...value,
      galleryImageUrls: value.galleryImageUrls.filter((_, i) => i !== index),
    });

  const moveGalleryItem = (index: number, direction: -1 | 1) => {
    const urls = [...value.galleryImageUrls];
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    [urls[index], urls[target]] = [urls[target], urls[index]];
    onChange({ ...value, galleryImageUrls: urls });
  };

  const appendGalleryUrls = (urls: string[]) => {
    if (urls.length === 0) return;
    onChange({ ...value, galleryImageUrls: [...value.galleryImageUrls, ...urls] });
  };

  const handleHeaderFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (gcsMode) {
        const url = await uploadSingleWithProgress(file, 'cover');
        if (url) setHeader(url);
        return;
      }

      if (!file.type.startsWith('image/')) return;
      try {
        setHeader(await compressImageFileToDataUrl(file));
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : 'No se pudo procesar la imagen',
          'error',
        );
      }
    },
    [addToast, gcsMode, uploadSingleWithProgress, value],
  );

  const handleGalleryFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      if (files.length === 0) return;

      if (gcsMode) {
        appendGalleryUrls(await uploadFilesSequential(files, 'gallery'));
        return;
      }

      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        addToast('Seleccioná archivos de imagen válidos', 'error');
        return;
      }
      try {
        const dataUrls = await compressImageFilesToDataUrls(imageFiles);
        appendGalleryUrls(dataUrls);
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : 'No se pudo procesar una imagen',
          'error',
        );
      }
    },
    [addToast, gcsMode, uploadFilesSequential, value],
  );

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

  const addGalleryUrl = () => {
    const url = galleryUrlDraft.trim();
    if (!url || rejectDataUrlIfGcs(url)) return;
    appendGalleryUrls([url]);
    setGalleryUrlDraft('');
  };

  const handleHeaderUrlChange = (url: string) => {
    if (rejectDataUrlIfGcs(url)) return;
    setHeader(url);
  };

  return (
    <div>
      {uploadProgress ? (
        <p className="mb-3 text-sm text-accent" role="status">
          {uploadProgress}
        </p>
      ) : null}

      {!galleryOnly && (
        <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Imagen de encabezado</label>
        <ImageUploadHint variant="cover" options={{ gcs: gcsMode }} className="mb-2" />
        <Input
          label="URL"
          value={value.headerImageUrl}
          onChange={(e) => handleHeaderUrlChange(e.target.value)}
          placeholder="https://…"
          disabled={isUploading}
        />
        <label className="mt-2 block text-sm text-text-muted">
          <span className="mr-2">O subir archivo:</span>
          <input
            type="file"
            accept={fileAccept}
            onChange={handleHeaderFile}
            disabled={isUploading}
            className="text-sm disabled:opacity-50"
          />
        </label>
        <ImageUrlPreview url={value.headerImageUrl} />
        </div>
      )}

      <div className={galleryOnly ? '' : 'mt-6'}>
        <label className="mb-1.5 block text-sm font-medium text-text">
          {galleryOnly ? 'Imágenes del ticket' : 'Galería'}
        </label>
        <ImageUploadHint
          variant="gallery"
          options={{
            gcs: gcsMode,
            usageOverride: galleryOnly
              ? 'Podés subir varias imágenes del ticket. Administración elegirá cuáles publicar.'
              : undefined,
          }}
          className="mb-3"
        />

        {value.galleryImageUrls.length > 0 ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {value.galleryImageUrls.map((url, index) => (
              <li key={`${index}-${url.slice(0, 32)}`} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-bg-muted">
                  {url.trim() && (url.startsWith('data:image') || /^https?:\/\//i.test(url.trim())) ? (
                    <img src={url.trim()} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-text-muted">
                      Sin vista previa
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeGalleryAt(index)}
                  disabled={isUploading}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-xs text-red-400 shadow hover:bg-bg-muted disabled:opacity-50"
                  aria-label={`Quitar imagen ${index + 1}`}
                >
                  ×
                </button>
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 bg-black/70 p-1">
                  <button
                    type="button"
                    onClick={() => moveGalleryItem(index, -1)}
                    disabled={isUploading || index === 0}
                    className="rounded px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/15 disabled:opacity-30"
                    aria-label={`Subir imagen ${index + 1}`}
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGalleryItem(index, 1)}
                    disabled={isUploading || index === value.galleryImageUrls.length - 1}
                    className="rounded px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/15 disabled:opacity-30"
                    aria-label={`Bajar imagen ${index + 1}`}
                  >
                    Bajar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">Sin imágenes en galería.</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex items-center rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm font-medium text-text hover:border-accent ${
              isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          >
            Seleccionar imágenes
            <input
              type="file"
              accept={fileAccept}
              multiple
              onChange={handleGalleryFiles}
              disabled={isUploading}
              className="sr-only"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Agregar por URL"
              value={galleryUrlDraft}
              onChange={(e) => setGalleryUrlDraft(e.target.value)}
              placeholder="https://…"
              disabled={isUploading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addGalleryUrl();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={addGalleryUrl}
            disabled={!galleryUrlDraft.trim() || isUploading}
            className="mb-0.5 rounded-lg border border-border px-3 py-2 text-sm text-accent hover:border-accent disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Build API payload from form value */
export function rentalProductImagesToPayload(value: RentalProductImagesValue) {
  const header = value.headerImageUrl.trim() || null;
  const galleryImages = value.galleryImageUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: 'IMAGE' as const }));
  return { headerImageUrl: header, galleryImages };
}

/** Load form from event detail (cover = header; media = gallery only) */
export function rentalProductImagesFromEvent(event: {
  coverImageUrl?: string | null;
  media?: Array<{ url: string; sortOrder?: number }>;
}): RentalProductImagesValue {
  const headerImageUrl = event.coverImageUrl?.trim() ?? '';
  const sortedMedia = [...(event.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const galleryImageUrls = sortedMedia.map((m) => m.url).filter(Boolean).filter(
    (url) => url !== headerImageUrl,
  );
  return { headerImageUrl, galleryImageUrls };
}
