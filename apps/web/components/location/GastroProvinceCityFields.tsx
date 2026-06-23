'use client';

import { useMemo } from 'react';
import { Input } from '@/components';
import { ProvinceCitySelect } from './ProvinceCitySelect';
import { applyProvinceToLocationValue } from './location.utils';

export type GastroLocationFieldValues = {
  province: string;
  city: string;
  address: string;
};

type Copy = {
  provinceLabel: string;
  cityLabel: string;
  addressLabel: string;
  addressHint: string;
  provincePlaceholder: string;
  cityProvinceFirstHint: string;
  citySelectPlaceholder: string;
  cityNoOptionsHint: string;
  citySelectHint: string;
};

type Props = {
  values: GastroLocationFieldValues;
  onChange: (patch: Partial<GastroLocationFieldValues>) => void;
  fieldErrors?: Partial<Record<keyof GastroLocationFieldValues, string>>;
  copy: Copy;
  disabled?: boolean;
  required?: boolean;
};

export function GastroProvinceCityFields({
  values,
  onChange,
  fieldErrors = {},
  copy,
  disabled = false,
  required = true,
}: Props) {
  const cityHint = useMemo(() => {
    if (!values.province) return copy.cityProvinceFirstHint;
    return copy.citySelectHint;
  }, [copy.cityProvinceFirstHint, copy.citySelectHint, values.province]);

  const handleProvinceChange = (province: string) => {
    const next = applyProvinceToLocationValue(
      { address: values.address, province: values.province, city: values.city, lat: null, lng: null },
      province,
    );
    onChange({ province: next.province, city: next.city });
  };

  return (
    <>
      <div className="space-y-2">
        <ProvinceCitySelect
          province={values.province}
          city={values.city}
          onProvinceChange={handleProvinceChange}
          onCityChange={(city) => onChange({ city })}
          disabled={disabled}
          required={required}
          provinceError={fieldErrors.province}
          cityError={fieldErrors.city}
          provinceLabel={copy.provinceLabel}
          cityLabel={copy.cityLabel}
          provincePlaceholder={copy.provincePlaceholder}
          cityPlaceholder={
            values.province ? copy.citySelectPlaceholder : copy.cityProvinceFirstHint
          }
        />
        <p className="text-xs text-text-muted">{cityHint}</p>
      </div>

      <div>
        <Input
          label={required ? `${copy.addressLabel} *` : copy.addressLabel}
          name="address"
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Mitre 250"
          required={required}
          autoComplete="street-address"
          error={fieldErrors.address}
        />
        <p className="mt-1.5 text-xs text-text-muted">{copy.addressHint}</p>
      </div>
    </>
  );
}
