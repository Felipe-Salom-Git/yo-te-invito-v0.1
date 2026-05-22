import { formatRentalOpeningHoursSummary, type RentalOpeningHours } from '@yo-te-invito/shared';

/** Shared card shell for rental detail sidebar blocks. */
export const RENTAL_DETAIL_CARD_CLASS =
  'rounded-xl border border-border bg-bg-muted p-4 sm:p-5';

export const RENTAL_DETAIL_SECTION_TITLE =
  'text-base font-semibold text-white sm:text-lg';

export function hasRentalOpeningHoursContent(
  schedule: RentalOpeningHours | null | undefined,
  note?: string | null,
): boolean {
  if (note?.trim()) return true;
  const { lines, exceptions } = formatRentalOpeningHoursSummary(schedule);
  return lines.length > 0 || exceptions.length > 0;
}
