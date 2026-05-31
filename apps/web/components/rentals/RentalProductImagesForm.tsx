'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, useToast } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { compressImageFileToDataUrl, compressImageFilesToDataUrls } from '@/lib/image-compress';
import { useUploadPublicImage } from '@/lib/query/uploads';
import {
  isDataImageUrl,
  validatePublicImageFile,
} from '@/lib/upload/validate-public-image-file';

export type RentalProductImagesValue = {
  headerImageUrl: string;
  galleryImageUrls: string[];
};

/**
 * Admin Rentals: upload via POST /uploads/public-image (GCS).
 * Uses rentalLocationId as entityId (product may not exist yet on create).
 * Paths: public/rental/{locationId}/{cover|gallery}/YYYY/MM/{uuid}.ext
 */
export type RentalGcsUploadConfig = {
  mode: 'gcs-rental';
  rentalLocationId: string;
};

export type RentalProductImagesFormProps = {
  value: RentalProductImagesValue;
  onChange: (value: RentalProductImagesValue) => void;
  /** When true, only the multi-image gallery is shown (no separate header field). */
  galleryOnly?: boolean;
  /** When set (Admin Rentals), file uploads go to GCS — no new data-URLs. */
  uploadConfig?: RentalGcsUploadConfig;
  /** Notifies parent while GCS uploads are in progress (disable save). */
  onUploadingChange?: (uploading: boolean) => void;
};

const GCS_UPLOAD_ERROR =
  'No pudimos subir la imagen. Revisá el formato/peso e intentá nuevamente.';

const IMAGE_ACCEPT_GCS = 'image/jpeg,image/png,image/webp';
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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = useUploadPublicImage();

  const gcsMode = uploadConfig?.mode === 'gcs-rental';
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

  const appendGalleryUrls = (urls: string[]) => {
    if (urls.length === 0) return;
    onChange({ ...value, galleryImageUrls: [...value.galleryImageUrls, ...urls] });
  };

  const uploadToGcs = useCallback(
    async (file: File, purpose: 'cover' | 'gallery'): Promise<string | null> => {
      if (!uploadConfig || uploadConfig.mode !== 'gcs-rental') return null;

      const validation = validatePublicImageFile(file);
      if (!validation.ok) {
        addToast(validation.message, 'error');
        return null;
      }

      try {
        const result = await uploadMutation.mutateAsync({
          file,
          scope: 'rental',
          purpose,
          entityId: uploadConfig.rentalLocationId,
        });
        return result.url;
      } catch {
        addToast(GCS_UPLOAD_ERROR, 'error');
        return null;
      }
    },
    [addToast, uploadConfig, uploadMutation],
  );

  const handleHeaderFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (gcsMode) {
        setIsUploading(true);
        setUploadProgress('Subiendo imagen…');
        try {
          const url = await uploadToGcs(file, 'cover');
          if (url) setHeader(url);
        } finally {
          setUploadProgress(null);
          setIsUploading(false);
        }
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
    [addToast, gcsMode, uploadToGcs, value],
  );

  const handleGalleryFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      if (files.length === 0) return;

      if (gcsMode) {
        setIsUploading(true);
        const uploaded: string[] = [];
        try {
          for (let i = 0; i < files.length; i++) {
            setUploadProgress(`Subiendo ${i + 1}/${files.length}…`);
            const url = await uploadToGcs(files[i]!, 'gallery');
            if (url) uploaded.push(url);
          }
          appendGalleryUrls(uploaded);
        } finally {
          setUploadProgress(null);
          setIsUploading(false);
        }
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
    [addToast, gcsMode, uploadToGcs, value],
  );

  const rejectDataUrlIfGcs = (url: string): boolean => {
    if (gcsMode && isDataImageUrl(url)) {
      addToast('Las imágenes embebidas (data-URL) no están permitidas. Subí un archivo o pegá una URL https.', 'error');
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
        <p className="mb-2 text-xs text-text-muted">
          Imagen principal del producto: fondo del encabezado en el detalle y vista en tarjetas.
          {gcsMode ? ' Se sube a Google Cloud Storage (JPEG, PNG o WEBP, máx. 5 MB).' : null}
        </p>
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
        <p className="mb-3 text-xs text-text-muted">
          {galleryOnly
            ? 'Podés subir varias imágenes. Administración elegirá cuáles publicar y cuál será la de cabecera.'
            : gcsMode
              ? 'Imágenes adicionales del producto. Subí varias a la vez (JPEG, PNG o WEBP, máx. 5 MB c/u).'
              : 'Imágenes adicionales del producto. Podés seleccionar varias a la vez.'}
        </p>

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
  media?: Array<{ url: string }>;
}): RentalProductImagesValue {
  const headerImageUrl = event.coverImageUrl?.trim() ?? '';
  const galleryImageUrls = (event.media?.map((m) => m.url).filter(Boolean) ?? []).filter(
    (url) => url !== headerImageUrl,
  );
  return { headerImageUrl, galleryImageUrls };
}
