'use client';

import { ProvinceCitySelect } from './ProvinceCitySelect';
import { LocationPickerMap } from './LocationPickerMap';
import { applyProvinceToLocationValue } from './location.utils';
import type { LocationValue } from './location.types';

type RentalLocationFieldsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  addressError?: string;
  mapError?: string;
  provinceError?: string;
  cityError?: string;
};

/** Location block for RentalLocation admin forms (province/city are UI-normalized; API stores address + geo). */
export function RentalLocationFields({
  value,
  onChange,
  disabled,
  required,
  addressError,
  mapError,
  provinceError,
  cityError,
}: RentalLocationFieldsProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-bg-muted p-4">
      <legend className="px-1 text-sm font-medium text-text">Ubicación del local</legend>
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
        helperText="La dirección y coordenadas se muestran al público en la ficha del local y productos asociados."
        error={addressError ?? mapError}
        required={required}
      />
    </fieldset>
  );
}
