'use client';

import { ProvinceCitySelect } from './ProvinceCitySelect';
import { AddressMapPicker } from './AddressMapPicker';
import { applyProvinceToLocationValue, type LocationFieldErrors } from './location.utils';
import type { LocationValue } from './location.types';
import type { GeoContext } from '@yo-te-invito/shared';

type EventLocationFieldsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  /** Per-field errors (`validateLocationFields`); each one renders next to its input. */
  errors?: LocationFieldErrors;
  addressError?: string;
  mapError?: string;
  provinceError?: string;
  cityError?: string;
  showVenueHint?: boolean;
  geoContext?: GeoContext;
};

/**
 * Modern location block shared by gastro locals, gastro promo events and producer events:
 * Georef province / city + address, geocoding (`/geo/resolve-address`) and draggable pin.
 */
export function EventLocationFields({
  value,
  onChange,
  disabled,
  required,
  errors,
  addressError,
  mapError,
  provinceError,
  cityError,
  geoContext = 'EVENT',
}: EventLocationFieldsProps) {
  return (
    <div className="min-w-0 space-y-4">
      <ProvinceCitySelect
        province={value.province}
        city={value.city}
        onProvinceChange={(province) => onChange(applyProvinceToLocationValue(value, province))}
        onCityChange={(city) => onChange({ ...value, city })}
        disabled={disabled}
        required={required}
        provinceError={errors?.province ?? provinceError}
        cityError={errors?.city ?? cityError}
      />
      <AddressMapPicker
        value={value}
        onChange={onChange}
        context={geoContext}
        disabled={disabled}
        label="Dirección y mapa"
        helperText="Completá provincia, ciudad y dirección. Ubicá en el mapa y arrastrá el pin si hace falta ajustar."
        error={errors?.address ?? errors?.map ?? addressError ?? mapError}
      />
    </div>
  );
}
