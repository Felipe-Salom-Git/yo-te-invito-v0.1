import { visualFaceMeta } from '@/lib/reviews/ratingDisplay';

type RatingFaceIconProps = {
  /** Visual level 1–5 (1 = worst). */
  level: number;
  /** Size utilities, e.g. `h-4 w-4`. */
  className?: string;
  /** Decorative by default: the surrounding element carries the accessible rating label. */
  decorative?: boolean;
};

/**
 * Rating face icon shared by every public rating surface (cards, summary, form, badges).
 * Icono de cara de valoración compartido por todas las superficies públicas.
 */
export function RatingFaceIcon({ level, className = 'h-4 w-4', decorative = true }: RatingFaceIconProps) {
  const face = visualFaceMeta(level);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={face.iconSrc}
      alt={decorative ? '' : face.label}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : face.label}
      draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
    />
  );
}
