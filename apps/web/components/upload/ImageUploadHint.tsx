import {
  getImageUploadHintLines,
  type ImageUploadHintOptions,
  type ImageUploadHintVariant,
} from '@/lib/upload/imageUploadHints';

type ImageUploadHintProps = {
  variant: ImageUploadHintVariant;
  options?: ImageUploadHintOptions;
  className?: string;
  id?: string;
};

export function ImageUploadHint({ variant, options, className = '', id }: ImageUploadHintProps) {
  const lines = getImageUploadHintLines(variant, options);
  return (
    <div id={id} className={`space-y-0.5 text-xs text-text-muted ${className}`.trim()}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
