/** Headroom bajo el límite Zod de 2_000_000 en galleryUrls / imageUrls. */
export const MAX_EMBEDDED_IMAGE_DATA_URL_CHARS = 1_900_000;

/**
 * Resize and JPEG-compress an image file for embedding as data URL in API JSON.
 * Iteratively reduces size/quality until under {@link MAX_EMBEDDED_IMAGE_DATA_URL_CHARS}.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1200,
  quality = 0.82,
): Promise<string> {
  let width = maxWidth;
  let q = quality;
  let last = await renderCompressedDataUrl(file, width, q);

  while (last.length > MAX_EMBEDDED_IMAGE_DATA_URL_CHARS && (width > 640 || q > 0.45)) {
    if (q > 0.45) {
      q = Math.max(0.45, q - 0.12);
    } else {
      width = Math.max(640, Math.round(width * 0.85));
    }
    last = await renderCompressedDataUrl(file, width, q);
  }

  if (last.length > MAX_EMBEDDED_IMAGE_DATA_URL_CHARS) {
    throw new Error(
      'La imagen es demasiado grande. Probá con otra foto o una resolución más baja.',
    );
  }

  return last;
}

export async function compressImageFilesToDataUrls(files: File[]): Promise<string[]> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  const results: string[] = [];
  for (const file of imageFiles) {
    results.push(await compressImageFileToDataUrl(file));
  }
  return results;
}

async function renderCompressedDataUrl(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let { width, height } = img;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}
