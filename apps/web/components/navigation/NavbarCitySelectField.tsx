'use client';

import { useMemo } from 'react';
import { cityDisplayLabel, cityNavbarLabel } from '@yo-te-invito/shared';
import { groupCitiesByProvince } from '@/lib/navigation/groupCitiesByProvince';
import { NAVBAR_CITY_ALL_VALUE } from '@/lib/navigation/navbarCityConfig';
import { useNavbarCitySelection } from '@/hooks/useNavbarCitySelection';
import { useNavbarDiscoveryCities } from '@/lib/query/navbar-cities';

const selectClass =
  'w-full max-w-[6.5rem] truncate rounded border border-border bg-bg-muted px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[7rem] lg:max-w-[7.5rem] lg:text-sm';

export interface NavbarCitySelectFieldProps {
  id?: string;
  className?: string;
  onCityApplied?: () => void;
  /** Hide the visible label (compact header placement). */
  hideLabel?: boolean;
}

export function NavbarCitySelectField({
  id = 'navbar-city-select',
  className = '',
  onCityApplied,
  hideLabel = false,
}: NavbarCitySelectFieldProps) {
  const { filterCategory, currentCity, applyCity } = useNavbarCitySelection();
  const { data: cities = [], isLoading, isError } = useNavbarDiscoveryCities(
    filterCategory || null,
  );

  const groups = useMemo(() => groupCitiesByProvince(cities), [cities]);

  const compactLabel = currentCity
    ? cityNavbarLabel(currentCity)
    : 'Ciudad';
  const fullLabel = currentCity ? cityDisplayLabel(currentCity) : 'Todas las ciudades';

  if (isError || (!isLoading && cities.length === 0)) {
    return null;
  }

  return (
    <div className={className}>
      {!hideLabel ? (
        <label
          htmlFor={id}
          className="mb-1 hidden text-xs font-medium uppercase tracking-wide text-text-muted lg:block"
        >
          Ciudad
        </label>
      ) : null}
      <select
        id={id}
        className={selectClass}
        value={currentCity}
        disabled={isLoading}
        aria-label={`Elegir ciudad — ${fullLabel}`}
        title={fullLabel}
        onChange={(e) => {
          applyCity(e.target.value);
          onCityApplied?.();
        }}
      >
        <option value={NAVBAR_CITY_ALL_VALUE}>Todas</option>
        {groups.map((group) => (
          <optgroup key={group.provinceLabel} label={group.provinceLabel}>
            {group.cities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="sr-only">{compactLabel}</span>
    </div>
  );
}
