'use client';

import { useMemo } from 'react';
import { cityDisplayLabel, cityQueryValue } from '@yo-te-invito/shared';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { groupCitiesByProvince } from '@/lib/navigation/groupCitiesByProvince';
import { useNavbarDiscoveryCities } from '@/lib/query/navbar-cities';
import { isExploreMainCategory } from '@/lib/explore/exploreFilters';

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

  const options = useMemo(() => {
    const rows: { value: string; label: string }[] = [{ value: '', label: 'Todas las ciudades' }];
    for (const group of groups) {
      for (const city of group.cities) {
        rows.push({
          value: city.value,
          label: `${city.label} · ${group.provinceLabel}`,
        });
      }
    }
    return rows;
  }, [groups]);

  if (isError) return null;

  const selectedLabel = value.trim() ? cityDisplayLabel(value) : 'Todas las ciudades';

  return (
    <div className="max-w-md">
      <SearchableCombobox
        id="explore-city-select"
        label="¿Dónde estás?"
        value={value}
        onChange={(next) => onChange(next.trim() ? cityQueryValue(next) : '')}
        options={options}
        placeholder={isLoading ? 'Cargando ciudades…' : 'Buscar ciudad…'}
        emptyMessage="Sin ciudades que coincidan"
        disabled={isLoading}
        allowClear
      />
      <p className="mt-0.5 text-xs text-text-muted">{selectedLabel}</p>
    </div>
  );
}
