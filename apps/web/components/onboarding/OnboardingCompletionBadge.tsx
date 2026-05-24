type Props = {
  doneCount: number;
  totalCount: number;
  className?: string;
};

export function OnboardingCompletionBadge({ doneCount, totalCount, className = '' }: Props) {
  const complete = totalCount > 0 && doneCount === totalCount;

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${
        complete
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-200/90'
      } ${className}`.trim()}
    >
      {doneCount}/{totalCount}
    </span>
  );
}
