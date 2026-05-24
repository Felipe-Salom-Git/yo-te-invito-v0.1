'use client';

import { Button } from '@/components';
import { PreferredCitySelect } from '@/components/me/PreferredCitySelect';
import { REGISTER_WIZARD_COPY } from './register-wizard-copy';
import { RegisterResponsibilityCallout } from './RegisterResponsibilityCallout';

type Props = {
  city: string;
  onCityChange: (city: string) => void;
  cityError?: string;
  email: string;
  firstName: string;
  lastName: string;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
};

export function RegisterBuyerStep({
  city,
  onCityChange,
  cityError,
  email,
  firstName,
  lastName,
  onBack,
  onContinue,
  disabled = false,
}: Props) {
  return (
    <div className="min-w-0 space-y-5">
      <dl className="rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-text-muted">Nombre</dt>
          <dd className="font-medium text-text">
            {firstName} {lastName}
          </dd>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          <dt className="text-text-muted">Email</dt>
          <dd className="font-medium text-text break-all">{email}</dd>
        </div>
      </dl>

      <div>
        <PreferredCitySelect
          label={REGISTER_WIZARD_COPY.buyer.cityLabel}
          value={city}
          onChange={onCityChange}
          error={cityError}
        />
        <p className="mt-1.5 text-xs text-text-muted">{REGISTER_WIZARD_COPY.buyer.cityHint}</p>
      </div>

      <RegisterResponsibilityCallout profileKey="USER" variant="subtle" />

      <p className="text-xs text-text-muted">{REGISTER_WIZARD_COPY.buyer.afterRegister}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="sm:w-auto" onClick={onBack} disabled={disabled}>
          ← Volver
        </Button>
        <Button type="button" className="flex-1 min-h-11" onClick={onContinue} disabled={disabled}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
