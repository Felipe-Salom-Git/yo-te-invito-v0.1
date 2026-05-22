'use client';

import { REFERRAL_LEGAL_DISCLAIMER_REFERRER } from '@/lib/producer/referral-display';

type Props = {
  variant?: 'block' | 'compact';
  className?: string;
};

export function ReferrerLegalDisclaimer({ variant = 'block', className = '' }: Props) {
  if (variant === 'compact') {
    return (
      <p className={`text-xs leading-relaxed text-text-muted ${className}`}>
        {REFERRAL_LEGAL_DISCLAIMER_REFERRER}
      </p>
    );
  }
  return (
    <div
      className={`rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-text-muted ${className}`}
    >
      <p className="font-medium text-text">Acuerdo comercial y pagos</p>
      <p className="mt-2 leading-relaxed">{REFERRAL_LEGAL_DISCLAIMER_REFERRER}</p>
    </div>
  );
}
