'use client';

import {
  getProfileResponsibilityCopy,
  type ProfileResponsibilityKey,
} from './register-wizard-responsibility-copy';

type Props = {
  profileKey: ProfileResponsibilityKey;
  /** Comprador: texto liviano sin card destacada */
  variant?: 'card' | 'subtle';
  className?: string;
};

export function RegisterResponsibilityCallout({
  profileKey,
  variant = 'card',
  className = '',
}: Props) {
  const text = getProfileResponsibilityCopy(profileKey);

  if (variant === 'subtle') {
    return (
      <p className={`text-xs leading-relaxed text-text-muted ${className}`.trim()} role="note">
        {text}
      </p>
    );
  }

  return (
    <div
      className={`break-words rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm leading-relaxed text-text-muted ${className}`.trim()}
      role="note"
    >
      {text}
    </div>
  );
}
