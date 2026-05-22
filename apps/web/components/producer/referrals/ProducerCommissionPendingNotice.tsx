'use client';

import { COMMISSION_RULES_PENDING_NOTICE } from '@/lib/producer/referral-display';

type Props = {
  className?: string;
};

export function ProducerCommissionPendingNotice({ className = '' }: Props) {
  return (
    <div
      className={`rounded-lg border border-border/80 bg-bg-muted/50 px-4 py-3 text-sm text-text-muted ${className}`}
    >
      <p className="font-medium text-text">Comisiones</p>
      <p className="mt-1">{COMMISSION_RULES_PENDING_NOTICE}</p>
    </div>
  );
}
