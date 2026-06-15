'use client';

import { useMemo } from 'react';
import { cityDisplayLabel, cityNavbarLabel } from '@yo-te-invito/shared';
import { groupCitiesByProvince } from '@/lib/navigation/groupCitiesByProvince';
import { NAVBAR_CITY_ALL_VALUE } from '@/lib/navigation/navbarCityConfig';
import { useNavbarCitySelection } from '@/hooks/useNavbarCitySelection';
import { useNavbarDiscoveryCities } from '@/lib/query/navbar-cities';
import { useToast } from '@/components';

const selectClass =
  'w-full truncate rounded border border-border bg-bg-muted px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 lg:text-sm';

export interface NavbarCitySelectFieldProps {
  id?: string;
  className?: string;
  onCityApplied?: () => void;
  /** Compact header placement (mobile / navbar right cluster). */
  compact?: boolean;
}

export function NavbarCitySelectField({
  id = 'navbar-city-select',
  className = '',
  onCityApplied,
  compact = false,
}: NavbarCitySelectFieldProps) {
  const { filterCategory, currentCity, applyCity, route } = useNavbarCitySelection();
  const { addToast } = useToast();
  const { data: cities = [], isLoading, isError } = useNavbarDiscoveryCities(
    filterCategory || null,
  );

  const groups = useMemo(() => groupCitiesByProvince(cities), [cities]);

  const fullLabel = currentCity ? cityDisplayLabel(currentCity) : 'Todas las ciudades';
  const shortLabel = currentCity ? cityNavbarLabel(currentCity) : 'Todas';

  if (isError || (!isLoading && cities.length === 0)) {
    return null;
  }

  const handleChange = (value: string) => {
    applyCity(value);
    if (route.kind === 'other') {
      addToast('La ciudad se aplicará al volver a los listados.', 'info');
    }
    onCityApplied?.();
  };

  if (compact) {
    return (
      <div className={`min-w-0 max-w-[6.5rem] sm:max-w-[7rem] lg:max-w-[8rem] ${className}`}>
        <label htmlFor={id} className="mb-0.5 block truncate text-[10px] font-medium text-text-muted sm:text-[11px]">
          ¿Dónde estás?
        </label>
        <select
          id={id}
          className={`${selectClass} max-w-full font-medium`}
          value={currentCity}
          disabled={isLoading}
          aria-label={`¿Dónde estás? ${fullLabel}`}
          title={fullLabel}
          onChange={(e) => handleChange(e.target.value)}
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
        <p className="mt-0.5 truncate text-[10px] text-text-muted sm:text-[11px]" title={fullLabel}>
          {shortLabel}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-text-muted">
        ¿Dónde estás?
      </label>
      <p className="mb-1.5 truncate text-sm font-medium text-text" title={fullLabel}>
        {fullLabel}
      </p>
      <select
        id={id}
        className={selectClass}
        value={currentCity}
        disabled={isLoading}
        aria-label={`¿Dónde estás? ${fullLabel}`}
        onChange={(e) => handleChange(e.target.value)}
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
