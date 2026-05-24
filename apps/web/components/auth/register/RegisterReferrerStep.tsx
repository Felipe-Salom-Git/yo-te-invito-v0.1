'use client';

import { Button, Input } from '@/components';
import { REGISTER_WIZARD_COPY } from './register-wizard-copy';
import { RegisterResponsibilityCallout } from './RegisterResponsibilityCallout';

type Props = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  displayNameError?: string;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
};

export function RegisterReferrerStep({
  displayName,
  onDisplayNameChange,
  displayNameError,
  onBack,
  onContinue,
  disabled = false,
}: Props) {
  const copy = REGISTER_WIZARD_COPY.referrer;

  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm text-text-muted">{copy.intro}</p>

      <div>
        <Input
          label={copy.displayNameLabel}
          name="displayName"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder={copy.displayNamePlaceholder}
          required
          autoComplete="nickname"
          error={displayNameError}
        />
        <p className="mt-1.5 text-xs text-text-muted">{copy.displayNameHint}</p>
      </div>

      <RegisterResponsibilityCallout profileKey="REFERRER" />

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
