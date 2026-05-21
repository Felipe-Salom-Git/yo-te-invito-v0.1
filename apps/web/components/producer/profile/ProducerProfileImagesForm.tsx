'use client';

import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { compressImageFileToDataUrl } from '@/lib/image-compress';

type Props = {
  logoUrl: string;
  coverImageUrl: string;
  galleryUrls: string[];
  onLogoChange: (url: string) => void;
  onImagesChange: (value: { headerImageUrl: string; galleryImageUrls: string[] }) => void;
};

async function readLogoFile(
  e: React.ChangeEvent<HTMLInputElement>,
  onLogoChange: (url: string) => void,
) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file?.type.startsWith('image/')) return;
  try {
    onLogoChange(await compressImageFileToDataUrl(file, 800, 0.85));
  } catch {
    onLogoChange('');
  }
}

export function ProducerProfileImagesForm({
  logoUrl,
  coverImageUrl,
  galleryUrls,
  onLogoChange,
  onImagesChange,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-text">Logo</p>
        <p className="mt-1 text-xs text-text-muted">Cuadrado, se muestra en la página pública.</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {logoUrl.trim() ? (
            <div className="h-20 w-20 overflow-hidden rounded-full border border-border">
              <ImageUrlPreview url={logoUrl} className="mt-0 max-h-none h-full w-full rounded-none object-cover" />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border text-xs text-text-muted">
              Sin logo
            </div>
          )}
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm text-text hover:border-accent">
            Subir logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => readLogoFile(e, onLogoChange)} />
          </label>
          {logoUrl.trim() ? (
            <button
              type="button"
              className="text-sm text-text-muted hover:text-text"
              onClick={() => onLogoChange('')}
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      <RentalProductImagesForm
        value={{ headerImageUrl: coverImageUrl, galleryImageUrls: galleryUrls }}
        onChange={onImagesChange}
      />
    </div>
  );
}
