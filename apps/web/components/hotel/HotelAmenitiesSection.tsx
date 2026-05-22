'use client';

type Props = {
  amenities: string[] | null | undefined;
};

export function HotelAmenitiesSection({ amenities }: Props) {
  const list = amenities?.filter((a) => a.trim()) ?? [];
  if (list.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Servicios y comodidades</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {list.map((item) => (
          <li
            key={item}
            className="rounded-full border border-border bg-bg-muted/50 px-3 py-1.5 text-sm text-text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
