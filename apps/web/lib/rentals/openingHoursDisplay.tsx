import {
  formatRentalOpeningHoursCompact,
  type RentalOpeningHours,
} from '@yo-te-invito/shared';

export function RentalOpeningHoursDisplay({
  schedule,
  note,
}: {
  schedule: RentalOpeningHours | null | undefined;
  note?: string | null;
}) {
  const lines = formatRentalOpeningHoursCompact(schedule);
  if (lines.length === 0 && !note?.trim()) return null;

  return (
    <div>
      {lines.length > 0 && (
        <ul className="space-y-1">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {note?.trim() && (
        <p className={lines.length > 0 ? 'mt-2 italic' : ''}>{note.trim()}</p>
      )}
    </div>
  );
}
