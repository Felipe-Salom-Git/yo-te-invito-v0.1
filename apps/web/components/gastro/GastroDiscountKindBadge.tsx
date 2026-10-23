import { isCourtesyOnlyVisibility } from '@yo-te-invito/shared';

/** G8.9: "Cortesía" vs "Descuento" badge (same look in portal and ADMIN). */
export function GastroDiscountKindBadge({ visibility }: { visibility?: string | null }) {
  const courtesy = isCourtesyOnlyVisibility(visibility);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        courtesy ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300'
      }`}
    >
      {courtesy ? 'Cortesía' : 'Descuento'}
    </span>
  );
}
