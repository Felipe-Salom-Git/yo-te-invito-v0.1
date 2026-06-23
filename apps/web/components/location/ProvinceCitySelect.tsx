'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components';
import { Select } from '@/components/ui/Select';
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

  const localityOptions = useMemo(() => {
    const manualOption = { value: MANUAL_LOCALITY_VALUE, label: MANUAL_LOCALITY_LABEL };
    const georefRows = localitiesQuery.data ?? [];
    const useGeoref = localitiesQuery.isSuccess && georefRows.length > 0;

    if (useGeoref) {
      return [
        ...dedupeSelectOptions(georefRows.map((loc) => ({ value: loc.name, label: loc.name }))),
        manualOption,
      ];
    }

    if (localitiesQuery.isError && province) {
      const p = ARGENTINA_PROVINCES.find(
        (x) => x.label === province || x.value === province,
      );
      return [
        ...dedupeSelectOptions(
          (p?.cities ?? []).map((c) => ({ value: c.label, label: c.label })),
        ),
        manualOption,
      ];
    }

    return [manualOption];
  }, [localitiesQuery.data, localitiesQuery.isError, localitiesQuery.isSuccess, province]);

  useEffect(() => {
    setManualLocality(false);
  }, [province]);

  useEffect(() => {
    if (!city.trim() || !province.trim()) {
      setManualLocality(false);
      return;
    }
    const inList = localityOptions.some(
      (o) => o.value === city && o.value !== MANUAL_LOCALITY_VALUE,
    );
    if (!inList) {
      setManualLocality(true);
    }
  }, [city, province, localityOptions]);

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

  const citySelectValue = manualLocality ? MANUAL_LOCALITY_VALUE : city;
  const provincesLoading = provincesQuery.isLoading && provinceOptions.length === 0;
  const localitiesLoading =
    Boolean(province) && localitiesQuery.isFetching && !localitiesQuery.isError;

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
          <Select
            label={
              cityLabel
                ? required
                  ? `${cityLabel} *`
                  : cityLabel
                : required
                  ? 'Ciudad / localidad *'
                  : 'Ciudad / localidad'
            }
            value={citySelectValue}
            onChange={(e) => handleCitySelect(e.target.value)}
            options={localityOptions}
            placeholder={
              localitiesLoading
                ? 'Cargando localidades…'
                : (cityPlaceholder ??
                  (province ? 'Seleccionar ciudad' : 'Elegí una provincia primero'))
            }
            disabled={disabled || !province || localitiesLoading}
            required={required}
            error={
              cityError ??
              (localitiesQuery.isError && province
                ? 'No pudimos cargar localidades. Usá la opción manual.'
                : undefined)
            }
          />
        </div>
      </div>
      {manualLocality ? (
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
