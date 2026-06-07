'use client';

type ExcursionDetailInfoGridProps = {
  subcategoryName?: string | null;
  subcategoryNames?: string[];
  operatorName?: string | null;
  departureTime?: string | null;
  durationText?: string | null;
  locationLabel?: string | null;
  hasLocation?: boolean;
  onViewLocation?: () => void;
};

const INFO_CARD_CLASS =
  'rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-accent/30';

function InfoCard({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <article className={INFO_CARD_CLASS}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{label}</p>
      <p className="mt-2 text-sm font-medium leading-snug text-white">{value}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 text-sm font-medium text-accent hover:underline"
        >
          {action.label}
        </button>
      ) : null}
    </article>
  );
}

export function ExcursionDetailInfoGrid({
  subcategoryName,
  subcategoryNames,
  operatorName,
  departureTime,
  durationText,
  locationLabel,
  hasLocation,
  onViewLocation,
}: ExcursionDetailInfoGridProps) {
  const cards: Array<{
    key: string;
    label: string;
    value: string;
    action?: { label: string; onClick: () => void };
  }> = [];

  const subcategoryLabel =
    subcategoryNames?.filter(Boolean).join(' · ') || subcategoryName?.trim() || null;
  if (subcategoryLabel) {
    cards.push({
      key: 'subcategory',
      label: subcategoryNames && subcategoryNames.length > 1 ? 'Tipos de excursión' : 'Tipo de excursión',
      value: subcategoryLabel,
    });
  }

  if (operatorName?.trim()) {
    cards.push({
      key: 'operator',
      label: 'Operador',
      value: operatorName.trim(),
    });
  }

  if (departureTime?.trim()) {
    cards.push({
      key: 'departure',
      label: 'Salida',
      value: departureTime.trim(),
    });
  }

  if (durationText?.trim()) {
    cards.push({
      key: 'duration',
      label: 'Duración',
      value: durationText.trim(),
    });
  }

  if (locationLabel?.trim()) {
    cards.push({
      key: 'location',
      label: 'Ubicación',
      value: locationLabel.trim(),
      action:
        hasLocation && onViewLocation
          ? { label: 'Ver en mapa', onClick: onViewLocation }
          : undefined,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section aria-label="Información clave">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <InfoCard
            key={card.key}
            label={card.label}
            value={card.value}
            action={card.action}
          />
        ))}
      </div>
    </section>
  );
}
