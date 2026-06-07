type FieldCharacterCounterProps = {
  current: number;
  max: number;
  className?: string;
  id?: string;
};

export function FieldCharacterCounter({
  current,
  max,
  className = '',
  id,
}: FieldCharacterCounterProps) {
  const atLimit = current >= max;
  return (
    <p
      id={id}
      className={`text-right text-xs ${atLimit ? 'text-amber-500' : 'text-text-muted'} ${className}`.trim()}
      aria-live="polite"
    >
      {current}/{max}
    </p>
  );
}
