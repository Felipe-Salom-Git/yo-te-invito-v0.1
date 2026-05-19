'use client';

/** Preview cover image from https URL or data URL (file upload). */
export function ImageUrlPreview({ url, className = '' }: { url: string; className?: string }) {
  const t = url.trim();
  if (!t || (!/^https?:\/\//i.test(t) && !t.startsWith('data:image'))) return null;
  return (
    <img
      src={t}
      alt=""
      className={`mt-2 max-h-48 w-full max-w-md rounded border border-border object-cover ${className}`}
    />
  );
}
