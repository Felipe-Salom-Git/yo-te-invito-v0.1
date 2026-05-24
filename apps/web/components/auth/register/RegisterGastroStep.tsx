'use client';

import { Button, Input } from '@/components';
import { GastroProvinceCityFields } from '@/components/location/GastroProvinceCityFields';
import { REGISTER_WIZARD_COPY } from './register-wizard-copy';
import { RegisterResponsibilityCallout } from './RegisterResponsibilityCallout';

export type GastroSignupFormValues = {
  displayName: string;
  contactEmail: string;
  province: string;
  city: string;
  address: string;
};

type Props = {
  values: GastroSignupFormValues;
  onChange: (patch: Partial<GastroSignupFormValues>) => void;
  fieldErrors?: Partial<Record<keyof GastroSignupFormValues, string>>;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
};

export function RegisterGastroStep({
  values,
  onChange,
  fieldErrors = {},
  onBack,
  onContinue,
  disabled = false,
}: Props) {
  const copy = REGISTER_WIZARD_COPY.gastro;

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
          label={copy.contactEmailLabel}
          name="contactEmail"
          type="email"
          value={values.contactEmail}
          onChange={(e) => onChange({ contactEmail: e.target.value })}
          required
          autoComplete="email"
          error={fieldErrors.contactEmail}
        />
        <p className="mt-1.5 text-xs text-text-muted">{copy.contactEmailHint}</p>
      </div>

      <GastroProvinceCityFields
        values={{
          province: values.province,
          city: values.city,
          address: values.address,
        }}
        onChange={onChange}
        fieldErrors={fieldErrors}
        copy={copy}
        disabled={disabled}
      />

      <div className="rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
        <p>{copy.portalHint}</p>
      </div>

      <RegisterResponsibilityCallout profileKey="GASTRO" />

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
