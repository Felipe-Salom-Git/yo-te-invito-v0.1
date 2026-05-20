'use client';

import { ProvinceCitySelect } from './ProvinceCitySelect';
import { LocationPickerMap } from './LocationPickerMap';
import { applyProvinceToLocationValue } from './location.utils';
import type { LocationValue } from './location.types';

type EventLocationFieldsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  /** When true, province/city/address are required in parent validation */
  required?: boolean;
  addressError?: string;
  mapError?: string;
  provinceError?: string;
  cityError?: string;
  showVenueHint?: boolean;
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
      <LocationPickerMap
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Dirección y mapa"
        helperText="Buscá la dirección o hacé clic en el mapa para colocar el pin. Podés arrastrarlo para ajustar."
        error={addressError ?? mapError}
        required={required}
      />
    </div>
  );
}
