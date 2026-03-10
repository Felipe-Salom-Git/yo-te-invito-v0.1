'use client';

/** Producer, organizer, or venue display for content cards. */
export interface ProducerMetaProps {
  /** Producer or brand name. Shown when provided. */
  producerName?: string | null;
  /** Venue or location name. Fallback when producerName absent. */
  venueName?: string | null;
  /** City. Optional secondary info. */
  city?: string | null;
  className?: string;
}

export function ProducerMeta({
  producerName,
  venueName,
  city,
  className = '',
}: ProducerMetaProps) {
  const primary = producerName ?? venueName ?? null;
  if (!primary) return null;

  return (
    <p
      className={`text-xs text-white/80 ${className}`}
      title={city ? `${primary} • ${city}` : primary}
    >
      {primary}
      {city && primary !== city ? (
        <span className="text-white/60"> • {city}</span>
      ) : null}
    </p>
  );
}
