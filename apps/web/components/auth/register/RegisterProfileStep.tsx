'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components';
import { PROFILE_CHOICES, REGISTER_WIZARD_COPY } from './register-wizard-copy';
import type { RegistrationProfileType } from '@yo-te-invito/shared';

type Props = {
  profileType: RegistrationProfileType;
  onSelect: (type: RegistrationProfileType) => void;
  onBack: () => void;
  disabled?: boolean;
  errorAlert?: ReactNode;
};

export function RegisterProfileStep({
  profileType,
  onSelect,
  onBack,
  disabled = false,
  errorAlert,
}: Props) {
  return (
    <div className="space-y-3" role="group" aria-labelledby="register-profile-type-label">
      <p id="register-profile-type-label" className="sr-only">
        Elegí cómo querés usar Yo Te Invito
      </p>
      {PROFILE_CHOICES.map((choice) => (
        <button
          key={choice.type}
          type="button"
          disabled={disabled}
          aria-label={`${choice.title}. ${choice.description}`}
          aria-current={profileType === choice.type ? 'true' : undefined}
          onClick={() => onSelect(choice.type)}
          className={`w-full min-h-11 rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            profileType === choice.type
              ? 'border-accent bg-accent/10'
              : 'border-border bg-bg-muted/40 hover:border-accent/50'
          }`}
        >
          <p className="break-words font-medium text-text">{choice.title}</p>
          <p className="mt-1 break-words text-sm leading-relaxed text-text-muted">
            {choice.description}
          </p>
        </button>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full min-h-11"
        onClick={onBack}
        disabled={disabled}
      >
        ← {REGISTER_WIZARD_COPY.cta.back}
      </Button>
      {errorAlert}
    </div>
  );
}
