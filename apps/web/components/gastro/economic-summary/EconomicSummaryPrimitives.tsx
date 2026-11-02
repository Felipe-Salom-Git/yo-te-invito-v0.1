import type { ReactNode } from 'react';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';
import { Badge } from '@/components';
import { ECONOMIC_PRECISION_LABEL } from '@/lib/gastro/discount-economic-summary-ui';

export function Money({ cents, currency = 'ARS' }: { cents: string; currency?: string }) {
  return <span className="font-medium text-text">{formatBenefitMoneyCents(cents, currency)}</span>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11px] leading-snug text-text-muted">{children}</p>;
}

export function PrecisionBadge({ precision }: { precision: string }) {
  return (
    <Badge variant={precision === 'EXACT' ? 'muted' : 'accent'}>
      {ECONOMIC_PRECISION_LABEL[precision] ?? precision}
    </Badge>
  );
}

export function EconomicBlock({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
        {aside}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-3 text-sm">
      <p className="text-text-muted">{label}</p>
      <p className="mt-0.5 text-base font-medium text-text">{value}</p>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}
