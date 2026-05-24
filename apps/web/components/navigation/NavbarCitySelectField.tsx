'use client';

import { useMemo } from 'react';
import { groupCitiesByProvince } from '@/lib/navigation/groupCitiesByProvince';
import { NAVBAR_CITY_ALL_VALUE } from '@/lib/navigation/navbarCityConfig';
import { useNavbarCitySelection } from '@/hooks/useNavbarCitySelection';
import { useNavbarDiscoveryCities } from '@/lib/query/navbar-cities';

const selectClass =
  'w-full rounded border border-border bg-bg-muted px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60';

export interface NavbarCitySelectFieldProps {
  id?: string;
  className?: string;
  onCityApplied?: () => void;
}

export function NavbarCitySelectField({
  id = 'navbar-city-select',
  className = '',
  onCityApplied,
}: NavbarCitySelectFieldProps) {
  const { filterCategory, currentCity, applyCity } = useNavbarCitySelection();
  const { data: cities = [], isLoading, isError } = useNavbarDiscoveryCities(
    filterCategory || null,
  );

  const groups = useMemo(() => groupCitiesByProvince(cities), [cities]);

  if (isError || (!isLoading && cities.length === 0)) {
    return null;
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
        Ciudad
      </label>
      <select
        id={id}
        className={selectClass}
        value={currentCity}
        disabled={isLoading}
        aria-label="Elegir ciudad para explorar"
        onChange={(e) => {
          applyCity(e.target.value);
          onCityApplied?.();
        }}
      >
        <option value={NAVBAR_CITY_ALL_VALUE}>Todas las ciudades</option>
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
    </div>
  );
}
