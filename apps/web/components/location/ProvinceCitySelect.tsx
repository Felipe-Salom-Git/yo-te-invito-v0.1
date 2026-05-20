'use client';

import { useMemo } from 'react';
import { Select } from '@/components/ui/Select';
import { ARGENTINA_PROVINCES } from './argentina-locations';
import type { ProvinceCitySelectProps } from './location.types';

export function ProvinceCitySelect({
  province,
  city,
  onProvinceChange,
  onCityChange,
  disabled,
  required,
  provinceError,
  cityError,
}: ProvinceCitySelectProps) {
  const provinceOptions = useMemo(
    () => ARGENTINA_PROVINCES.map((p) => ({ value: p.value, label: p.label })),
    [],
  );

  const cityOptions = useMemo(() => {
    const p = ARGENTINA_PROVINCES.find((x) => x.value === province);
    return p?.cities.map((c) => ({ value: c.value, label: c.label })) ?? [];
  }, [province]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select
        label={required ? 'Provincia *' : 'Provincia'}
        value={province}
        onChange={(e) => onProvinceChange(e.target.value)}
        options={provinceOptions}
        placeholder="Seleccionar provincia"
        disabled={disabled}
        required={required}
        error={provinceError}
      />
      <Select
        label={required ? 'Ciudad / localidad *' : 'Ciudad / localidad'}
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        options={cityOptions}
        placeholder={province ? 'Seleccionar ciudad' : 'Elegí una provincia primero'}
        disabled={disabled || !province}
        required={required}
        error={cityError}
      />
    </div>
  );
}
