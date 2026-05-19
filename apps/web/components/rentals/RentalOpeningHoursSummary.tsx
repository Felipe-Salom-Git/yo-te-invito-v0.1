import {
  formatRentalOpeningHoursSummary,
  type RentalOpeningHours,
} from '@yo-te-invito/shared';

const CARD_TEXT = 'text-sm text-text-muted';

export function RentalOpeningHoursSummary({
  schedule,
  note,
}: {
  schedule: RentalOpeningHours | null | undefined;
  note?: string | null;
}) {
  const { lines, exceptions } = formatRentalOpeningHoursSummary(schedule);
  const hasSchedule = lines.length > 0;
  const hasNote = Boolean(note?.trim());

  if (!hasSchedule && !hasNote) {
    return <p className={CARD_TEXT}>Horario no informado.</p>;
  }

  return (
    <div className="space-y-1">
      {hasSchedule && (
        <ul className={`space-y-0.5 ${CARD_TEXT}`}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {exceptions.length > 0 && (
        <div className="pt-1">
          <p className="text-xs font-medium text-text">Excepciones</p>
          <ul className={`mt-0.5 space-y-0.5 ${CARD_TEXT}`}>
            {exceptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {hasNote && (
        <p className={hasSchedule ? `mt-1.5 italic ${CARD_TEXT}` : CARD_TEXT}>{note!.trim()}</p>
      )}
    </div>
  );
}
