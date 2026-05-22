'use client';

import { formatMoneyCents } from '@/lib/producer/referral-display';

export type ReferralKpiItem = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

type Props = {
  items: ReferralKpiItem[];
  className?: string;
};

export function ReferralMetricsKpiGrid({ items, className = '' }: Props) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border px-4 py-4 ${
            item.accent ? 'border-accent/30 bg-accent/5' : 'border-border bg-bg-muted/40'
          }`}
          title={item.hint}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{item.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${item.accent ? 'text-accent' : 'text-text'}`}>
            {item.value}
          </p>
          {item.hint && <p className="mt-1 text-xs text-text-muted">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function moneyKpi(cents: number): string {
  return formatMoneyCents(cents);
}
