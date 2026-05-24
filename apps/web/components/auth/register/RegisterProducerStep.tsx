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

export function RegisterProducerStep({
  displayName,
  onDisplayNameChange,
  displayNameError,
  onBack,
  onContinue,
  disabled = false,
}: Props) {
  const copy = REGISTER_WIZARD_COPY.producer;

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
          autoComplete="organization"
          error={displayNameError}
        />
        <p className="mt-1.5 text-xs text-text-muted">{copy.displayNameHint}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
        <p>{copy.portalHint}</p>
      </div>

      <RegisterResponsibilityCallout profileKey="PRODUCER" />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="sm:w-auto min-h-11" onClick={onBack} disabled={disabled}>
          ← Volver
        </Button>
        <Button type="button" className="flex-1 min-h-11" onClick={onContinue} disabled={disabled}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
