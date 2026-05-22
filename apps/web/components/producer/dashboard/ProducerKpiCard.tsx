interface ProducerKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  unavailable?: boolean;
}

/** KPI tile for producer dashboard (dark premium). */
export function ProducerKpiCard({ label, value, hint, unavailable }: ProducerKpiCardProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/60 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${
          unavailable ? 'text-text-muted' : 'text-text'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
