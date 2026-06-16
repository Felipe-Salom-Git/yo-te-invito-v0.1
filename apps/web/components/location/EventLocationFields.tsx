'use client';

import { ProvinceCitySelect } from './ProvinceCitySelect';
import { AddressMapPicker } from './AddressMapPicker';
import { applyProvinceToLocationValue } from './location.utils';
import type { LocationValue } from './location.types';
import type { GeoContext } from '@yo-te-invito/shared';

type EventLocationFieldsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  addressError?: string;
  mapError?: string;
  provinceError?: string;
  cityError?: string;
  showVenueHint?: boolean;
  geoContext?: GeoContext;
};

export function EventLocationFields({
  value,
  onChange,
  disabled,
  required,
  addressError,
  mapError,
  provinceError,
  cityError,
  geoContext = 'EVENT',
}: EventLocationFieldsProps) {
  return (
    <div className="space-y-4">
      <ProvinceCitySelect
        province={value.province}
        city={value.city}
        onProvinceChange={(province) => onChange(applyProvinceToLocationValue(value, province))}
        onCityChange={(city) => onChange({ ...value, city })}
        disabled={disabled}
        required={required}
        provinceError={provinceError}
        cityError={cityError}
      />
      <AddressMapPicker
        value={value}
        onChange={onChange}
        context={geoContext}
        disabled={disabled}
        label="Dirección y mapa"
        helperText="Completá provincia, ciudad y dirección. Ubicá en el mapa y arrastrá el pin si hace falta ajustar."
        error={addressError ?? mapError}
      />
    </div>
  );
}
