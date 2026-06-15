'use client';

import { useMemo } from 'react';
import { cityDisplayLabel, cityQueryValue } from '@yo-te-invito/shared';
import { groupCitiesByProvince } from '@/lib/navigation/groupCitiesByProvince';
import { useNavbarDiscoveryCities } from '@/lib/query/navbar-cities';
import { isExploreMainCategory } from '@/lib/explore/exploreFilters';

const selectClass =
  'mt-1 w-full max-w-md rounded border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

export interface ExploreCityFilterProps {
  value: string;
  category?: string;
  onChange: (city: string) => void;
}

/** Primary city filter for Explore — deduped catalog + discovery sample. */
export function ExploreCityFilter({ value, category, onChange }: ExploreCityFilterProps) {
  const categoryScope = isExploreMainCategory(category ?? '') ? category : null;
  const { data: cities = [], isLoading, isError } = useNavbarDiscoveryCities(categoryScope);
  const groups = useMemo(() => groupCitiesByProvince(cities), [cities]);

  const selectedLabel = value.trim() ? cityDisplayLabel(value) : 'Todas las ciudades';

  if (isError) return null;

  return (
    <div className="max-w-md">
      <label htmlFor="explore-city-select" className="block text-sm font-medium text-text">
        ¿Dónde estás?
      </label>
      <p className="mt-0.5 text-xs text-text-muted">{selectedLabel}</p>
      <select
        id="explore-city-select"
        className={selectClass}
        value={value}
        disabled={isLoading}
        aria-label={`¿Dónde estás? ${selectedLabel}`}
        onChange={(e) => {
          const raw = e.target.value.trim();
          onChange(raw ? cityQueryValue(raw) : '');
        }}
      >
        <option value="">Todas las ciudades</option>
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
