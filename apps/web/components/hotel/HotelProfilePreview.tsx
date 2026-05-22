'use client';

import type { HotelProfile } from '@/repositories/interfaces';

type Props = {
  profile: HotelProfile;
};

export function HotelProfilePreview({ profile }: Props) {
  const cover = profile.bannerUrl ?? profile.logoUrl;
  const amenities = profile.amenities ?? [];

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-bg-muted/40">
      {cover ? (
        <div className="relative h-36 w-full bg-black/40">
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-text">{profile.displayName}</h3>
        {profile.starCategory != null ? (
          <p className="mt-1 text-sm text-text-muted">{profile.starCategory} estrellas</p>
        ) : null}
        {profile.city || profile.address ? (
          <p className="mt-2 text-sm text-text-muted">
            {[profile.address, profile.city].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {profile.description ? (
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-text-muted">
            {profile.description}
          </p>
        ) : null}
        {amenities.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {amenities.slice(0, 8).map((a) => (
              <li
                key={a}
                className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text-muted"
              >
                {a}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 text-xs text-text-muted">
          Vista previa interna — el establecimiento no aparece aún en el descubrimiento principal.
        </p>
      </div>
    </article>
  );
}
