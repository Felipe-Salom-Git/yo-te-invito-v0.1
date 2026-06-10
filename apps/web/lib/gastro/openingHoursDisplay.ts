import {
  formatGastroWeeklyOpeningHoursCompact,
  formatRentalOpeningHoursSummary,
  getGastroWeeklyOpenStatus,
  hasGastroWeeklyOpeningHoursContent,
  type GastroOpeningHoursMode,
  type GastroOpenStatusResult,
  type GastroWeeklyOpeningHours,
  type RentalOpeningHours,
} from '@yo-te-invito/shared';
import { hasRentalOpeningHoursContent } from '@/lib/rentals/rentalDetailUi';

export type GastroHoursDisplayInput = {
  openingHoursMode?: GastroOpeningHoursMode;
  openingHours?: RentalOpeningHours | null;
  openingHoursWeekly?: GastroWeeklyOpeningHours | null;
  openingHoursNote?: string | null;
};

export function resolveGastroOpeningHoursMode(
  input: GastroHoursDisplayInput,
): GastroOpeningHoursMode {
  if (input.openingHoursMode === 'weekly' || input.openingHoursMode === 'simple') {
    return input.openingHoursMode;
  }
  return hasGastroWeeklyOpeningHoursContent(input.openingHoursWeekly) ? 'weekly' : 'simple';
}

export function getGastroOpenStatus(input: GastroHoursDisplayInput): GastroOpenStatusResult {
  const mode = resolveGastroOpeningHoursMode(input);
  if (mode === 'weekly' && hasGastroWeeklyOpeningHoursContent(input.openingHoursWeekly)) {
    return getGastroWeeklyOpenStatus(input.openingHoursWeekly);
  }
  return { status: 'unknown', label: 'Horarios no informados' };
}

/** Weekly mode with empty schedule falls back to simple hours for display. */
export function hasGastroOpeningHoursContent(input: GastroHoursDisplayInput): boolean {
  const mode = resolveGastroOpeningHoursMode(input);
  if (mode === 'weekly') {
    if (hasGastroWeeklyOpeningHoursContent(input.openingHoursWeekly)) return true;
    return hasRentalOpeningHoursContent(input.openingHours, input.openingHoursNote);
  }
  return hasRentalOpeningHoursContent(input.openingHours, input.openingHoursNote);
}

export function formatGastroOpeningHoursLines(input: GastroHoursDisplayInput): string[] {
  const mode = resolveGastroOpeningHoursMode(input);
  if (mode === 'weekly' && hasGastroWeeklyOpeningHoursContent(input.openingHoursWeekly)) {
    return formatGastroWeeklyOpeningHoursCompact(input.openingHoursWeekly);
  }
  const { lines, exceptions } = formatRentalOpeningHoursSummary(input.openingHours);
  return [...lines, ...exceptions.map((e) => `Excepción: ${e}`)];
}
