'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components';
import { Select } from '@/components/ui/Select';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { useGeoLocalities, useGeoProvinces } from '@/lib/query/geo';
import { ARGENTINA_PROVINCES } from './argentina-locations';
import { dedupeSelectOptions } from './location-geo.utils';
import {
  MANUAL_LOCALITY_LABEL,
  MANUAL_LOCALITY_VALUE,
  type ProvinceCitySelectProps,
} from './location.types';

export function ProvinceCitySelect({
  province,
  city,
  onProvinceChange,
  onCityChange,
  disabled,
  required,
  provinceError,
  cityError,
  provinceLabel,
  cityLabel,
  provincePlaceholder,
  cityPlaceholder,
  allowManualLocality = true,
}: ProvinceCitySelectProps) {
  const provincesQuery = useGeoProvinces();
  const localitiesQuery = useGeoLocalities(province);
  const [manualLocality, setManualLocality] = useState(false);

  const provinceOptions = useMemo(() => {
    if (provincesQuery.data?.length) {
      return dedupeSelectOptions(
        provincesQuery.data.map((p) => ({ value: p.name, label: p.name })),
      );
    }
    if (provincesQuery.isError) {
      return dedupeSelectOptions(
        ARGENTINA_PROVINCES.map((p) => ({ value: p.label, label: p.label })),
      );
    }
    return [];
  }, [provincesQuery.data, provincesQuery.isError]);

  const catalogLocalityOptions = useMemo(() => {
    const georefRows = localitiesQuery.data ?? [];
    const useGeoref = localitiesQuery.isSuccess && georefRows.length > 0;

    if (useGeoref) {
      return dedupeSelectOptions(georefRows.map((loc) => ({ value: loc.name, label: loc.name })));
    }

    if (localitiesQuery.isError && province) {
      const p = ARGENTINA_PROVINCES.find(
        (x) => x.label === province || x.value === province,
      );
      return dedupeSelectOptions(
        (p?.cities ?? []).map((c) => ({ value: c.label, label: c.label })),
      );
    }

    return [];
  }, [localitiesQuery.data, localitiesQuery.isError, localitiesQuery.isSuccess, province]);

  const cityComboboxOptions = useMemo(() => {
    if (!allowManualLocality) return catalogLocalityOptions;
    return [
      ...catalogLocalityOptions,
      { value: MANUAL_LOCALITY_VALUE, label: MANUAL_LOCALITY_LABEL },
    ];
  }, [allowManualLocality, catalogLocalityOptions]);

  useEffect(() => {
    setManualLocality(false);
  }, [province]);

  useEffect(() => {
    if (!city.trim() || !province.trim()) {
      setManualLocality(false);
      return;
    }
    const inList = catalogLocalityOptions.some((o) => o.value === city);
    if (!inList && allowManualLocality) {
      setManualLocality(true);
    } else if (inList) {
      setManualLocality(false);
    }
  }, [allowManualLocality, catalogLocalityOptions, city, province]);

  const handleProvinceChange = (next: string) => {
    setManualLocality(false);
    onProvinceChange(next);
  };

  const handleCitySelect = (next: string) => {
    if (next === MANUAL_LOCALITY_VALUE) {
      setManualLocality(true);
      onCityChange('');
      return;
    }
    setManualLocality(false);
    onCityChange(next);
  };

  const cityComboboxValue = manualLocality ? MANUAL_LOCALITY_VALUE : city;
  const provincesLoading = provincesQuery.isLoading && provinceOptions.length === 0;
  const localitiesLoading =
    Boolean(province) && localitiesQuery.isFetching && !localitiesQuery.isError;

  const resolvedCityLabel = cityLabel
    ? required
      ? `${cityLabel} *`
      : cityLabel
    : required
      ? 'Ciudad / localidad *'
      : 'Ciudad / localidad';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Select
            label={
              provinceLabel
                ? required
                  ? `${provinceLabel} *`
                  : provinceLabel
                : required
                  ? 'Provincia *'
                  : 'Provincia'
            }
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            options={provinceOptions}
            placeholder={
              provincesLoading
                ? 'Cargando provincias…'
                : (provincePlaceholder ?? 'Seleccionar provincia')
            }
            disabled={disabled || provincesLoading}
            required={required}
            error={provinceError ?? (provincesQuery.isError ? 'No pudimos cargar provincias.' : undefined)}
          />
        </div>
        <div className="space-y-1">
          <SearchableCombobox
            label={resolvedCityLabel}
            value={cityComboboxValue}
            onChange={handleCitySelect}
            options={cityComboboxOptions}
            placeholder={
              localitiesLoading
                ? 'Cargando localidades…'
                : (cityPlaceholder ??
                  (province ? 'Buscar ciudad…' : 'Elegí una provincia primero'))
            }
            disabled={disabled || !province || localitiesLoading}
            required={required}
            emptyMessage="Sin ciudades que coincidan"
            error={
              cityError ??
              (localitiesQuery.isError && province
                ? allowManualLocality
                  ? 'No pudimos cargar localidades. Usá la opción manual.'
                  : 'No pudimos cargar localidades.'
                : undefined)
            }
          />
        </div>
      </div>
      {allowManualLocality && manualLocality ? (
        <Input
          label={required ? 'Otra localidad *' : 'Otra localidad'}
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Escribí tu ciudad o localidad"
          disabled={disabled}
          required={required}
          error={cityError}
        />
      ) : null}
    </div>
  );
}
