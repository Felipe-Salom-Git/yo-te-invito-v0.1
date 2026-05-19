'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';

export type RentalProductImagesValue = {
  headerImageUrl: string;
  galleryImageUrls: string[];
};

export type RentalProductImagesFormProps = {
  value: RentalProductImagesValue;
  onChange: (value: RentalProductImagesValue) => void;
};

function readImageFilesAsDataUrls(files: File[]): Promise<string[]> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return Promise.resolve([]);

  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function RentalProductImagesForm({ value, onChange }: RentalProductImagesFormProps) {
  const [galleryUrlDraft, setGalleryUrlDraft] = useState('');

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

  const handleHeaderFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setHeader(reader.result as string);
    reader.readAsDataURL(file);
  }, [value]);

  const handleGalleryFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      const dataUrls = await readImageFilesAsDataUrls(files);
      appendGalleryUrls(dataUrls);
    },
    [value],
  );

  const addGalleryUrl = () => {
    const url = galleryUrlDraft.trim();
    if (!url) return;
    appendGalleryUrls([url]);
    setGalleryUrlDraft('');
  };

  return (
    <div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Imagen de encabezado</label>
        <p className="mb-2 text-xs text-text-muted">
          Imagen principal del producto: fondo del encabezado en el detalle y vista en tarjetas.
        </p>
        <Input
          label="URL"
          value={value.headerImageUrl}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="https://…"
        />
        <label className="mt-2 block text-sm text-text-muted">
          <span className="mr-2">O subir archivo:</span>
          <input type="file" accept="image/*" onChange={handleHeaderFile} className="text-sm" />
        </label>
        <ImageUrlPreview url={value.headerImageUrl} />
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-text">Galería</label>
        <p className="mb-3 text-xs text-text-muted">
          Imágenes adicionales del producto. Podés seleccionar varias a la vez.
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
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-xs text-red-400 shadow hover:bg-bg-muted"
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
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm font-medium text-text hover:border-accent">
            Seleccionar imágenes
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryFiles}
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
            disabled={!galleryUrlDraft.trim()}
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
