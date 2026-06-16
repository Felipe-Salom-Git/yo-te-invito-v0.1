'use client';

import { ProvinceCitySelect } from './ProvinceCitySelect';
import { AddressMapPicker } from './AddressMapPicker';
import { applyProvinceToLocationValue } from './location.utils';
import type { LocationValue } from './location.types';
import type { GeoContext } from '@yo-te-invito/shared';

type RentalLocationFieldsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  addressError?: string;
  mapError?: string;
  provinceError?: string;
  cityError?: string;
  geoContext?: Extract<GeoContext, 'RENTAL_LOCATION' | 'EXCURSION_OPERATOR'>;
};

/** Location block for RentalLocation / ExcursionOperator admin forms. */
export function RentalLocationFields({
  value,
  onChange,
  disabled,
  required,
  addressError,
  mapError,
  provinceError,
  cityError,
  geoContext = 'RENTAL_LOCATION',
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
      <AddressMapPicker
        value={value}
        onChange={onChange}
        context={geoContext}
        disabled={disabled}
        label="Dirección y mapa"
        helperText="La dirección y coordenadas se muestran al público en la ficha del local y productos asociados."
        error={addressError ?? mapError}
      />
    </fieldset>
  );
}
