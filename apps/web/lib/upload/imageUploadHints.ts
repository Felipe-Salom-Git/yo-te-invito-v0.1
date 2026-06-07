import { PUBLIC_IMAGE_MAX_BYTES } from './validate-public-image-file';

/** Mirrors API default — see UPLOAD_MAX_IMAGE_MB. */
export const IMAGE_UPLOAD_MAX_MB = PUBLIC_IMAGE_MAX_BYTES / (1024 * 1024);

export const IMAGE_UPLOAD_FORMATS_LABEL = 'JPG, PNG o WebP';

export type ImageUploadHintVariant =
  | 'cover'
  | 'gallery'
  | 'galleryHorizontal'
  | 'banner'
  | 'logo'
  | 'openGraph'
  | 'content';

type HintConfig = {
  dimensions: string;
  usage: string;
};

const HINT_CONFIG: Record<ImageUploadHintVariant, HintConfig> = {
  cover: {
    dimensions: '1200 × 675 px',
    usage: 'Portada principal: detalle público y tarjetas de listado.',
  },
  gallery: {
    dimensions: '1080 × 1080 px',
    usage: 'Imágenes adicionales en la galería del detalle.',
  },
  galleryHorizontal: {
    dimensions: '1200 × 900 px',
    usage: 'Fotos horizontales para galería o carrusel.',
  },
  banner: {
    dimensions: '1600 × 600 px',
    usage: 'Banner o encabezado ancho en ficha o categoría.',
  },
  logo: {
    dimensions: '512 × 512 px',
    usage: 'Logo o avatar de marca, preferiblemente cuadrado.',
  },
  openGraph: {
    dimensions: '1200 × 630 px',
    usage: 'Vista previa al compartir en redes sociales.',
  },
  content: {
    dimensions: '1080 × 1080 px',
    usage: 'Imagen ilustrativa del contenido editorial.',
  },
};

export type ImageUploadHintOptions = {
  /** When true, mentions GCS upload (forms with uploadConfig). */
  gcs?: boolean;
  /** Replaces the default usage line from the variant. */
  usageOverride?: string;
};

export function getImageUploadHintLines(
  variant: ImageUploadHintVariant,
  options?: ImageUploadHintOptions,
): string[] {
  const cfg = HINT_CONFIG[variant];
  const usage = options?.usageOverride?.trim() || cfg.usage;
  const lines = [
    `Recomendado: ${cfg.dimensions}.`,
    `Formato: ${IMAGE_UPLOAD_FORMATS_LABEL}.`,
    `Máximo: ${IMAGE_UPLOAD_MAX_MB} MB.`,
    usage,
  ];
  if (options?.gcs) {
    lines.push('Se sube a Google Cloud Storage.');
  }
  return lines;
}
