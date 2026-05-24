'use client';

import { useMemo } from 'react';
import { Button, Input } from '@/components';
import { ProvinceCitySelect } from '@/components/location/ProvinceCitySelect';
import { ARGENTINA_PROVINCES } from '@/components/location/argentina-locations';
import { applyProvinceToLocationValue } from '@/components/location/location.utils';
import { REGISTER_WIZARD_COPY } from './register-wizard-copy';
import { RegisterResponsibilityCallout } from './RegisterResponsibilityCallout';

export type HotelSignupFormValues = {
  displayName: string;
  websiteUrl: string;
  province: string;
  city: string;
};

type Props = {
  values: HotelSignupFormValues;
  onChange: (patch: Partial<HotelSignupFormValues>) => void;
  fieldErrors?: Partial<Record<keyof HotelSignupFormValues, string>>;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
};

export function RegisterHotelStep({
  values,
  onChange,
  fieldErrors = {},
  onBack,
  onContinue,
  disabled = false,
}: Props) {
  const copy = REGISTER_WIZARD_COPY.hotel;

  const cityOptions = useMemo(() => {
    const p = ARGENTINA_PROVINCES.find((x) => x.value === values.province);
    return p?.cities ?? [];
  }, [values.province]);

  const cityEmptyHint =
    values.province && cityOptions.length === 0
      ? copy.cityNoOptionsHint
      : !values.province
        ? copy.cityProvinceFirstHint
        : copy.citySelectHint;

  const handleProvinceChange = (province: string) => {
    const next = applyProvinceToLocationValue(
      { address: '', province: values.province, city: values.city, lat: null, lng: null },
      province,
    );
    onChange({ province: next.province, city: next.city });
  };

  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm text-text-muted">{copy.intro}</p>

      <Input
        label={copy.displayNameLabel}
        name="displayName"
        value={values.displayName}
        onChange={(e) => onChange({ displayName: e.target.value })}
        placeholder={copy.displayNamePlaceholder}
        required
        autoComplete="organization"
        error={fieldErrors.displayName}
      />

      <div>
        <Input
          label={copy.websiteUrlLabel}
          name="websiteUrl"
          type="url"
          value={values.websiteUrl}
          onChange={(e) => onChange({ websiteUrl: e.target.value })}
          placeholder="https://..."
          required
          autoComplete="url"
          error={fieldErrors.websiteUrl}
        />
        <p className="mt-1.5 text-xs text-text-muted">{copy.websiteUrlHint}</p>
      </div>

      <div className="space-y-2">
        <ProvinceCitySelect
          province={values.province}
          city={values.city}
          onProvinceChange={handleProvinceChange}
          onCityChange={(city) => onChange({ city })}
          disabled={disabled}
          required
          provinceError={fieldErrors.province}
          cityError={fieldErrors.city}
          provinceLabel="Provincia"
          cityLabel="Ciudad"
          cityPlaceholder={
            values.province
              ? cityOptions.length > 0
                ? 'Seleccionar ciudad'
                : copy.cityNoOptionsHint
              : copy.cityProvinceFirstHint
          }
        />
        <p className="text-xs text-text-muted">{cityEmptyHint}</p>
      </div>

      <RegisterResponsibilityCallout profileKey="HOTEL" />

      <div className="rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
        <p>{copy.portalHint}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:w-auto"
          onClick={onBack}
          disabled={disabled}
        >
          ← Volver
        </Button>
        <Button type="button" className="min-h-11 flex-1" onClick={onContinue} disabled={disabled}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
